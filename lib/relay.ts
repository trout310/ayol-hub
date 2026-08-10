import type { Project } from './projects'

function getCsrf(): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.match(/(?:^|;\s*)hub_csrf=([^;]*)/)?.[1] ?? ''
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/relay/projects', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Relay error: ${res.status}`)
  return res.json()
}

// Async job + poll (2026-08-08): a JARVIS turn's cost grows with turn count
// (server replays the session transcript + runs tool loops), so later turns
// crossed Vercel's 60s function ceiling and the old single-stream fetch died
// mid-answer — the chat froze after a few back-and-forths. Now POST /chat
// starts the job (sub-second, returns job_id) and we poll /chat/poll for
// buffered events. Same onChunk event contract as before, so ChatInterface
// is unchanged. A hard overall deadline + poll-error handling means a dead
// job surfaces as a thrown error (UI unfreezes) instead of a silent hang.
const POLL_INTERVAL_MS = 700
const OVERALL_DEADLINE_MS = 5 * 60_000 // 5 min hard cap per turn

export async function streamChat(
  projectId: string,
  message: string,
  sessionId: string | null,
  onChunk: (event: Record<string, unknown>) => void
): Promise<string | null> {
  const startRes = await fetch(`/api/relay/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
    body: JSON.stringify({ message, session_id: sessionId }),
    // Codex review 2026-08-08: abort a hung start request instead of letting the
    // UI sit in streaming state indefinitely.
    signal: AbortSignal.timeout(20_000),
  })

  if (!startRes.ok) throw new Error(`Chat failed: ${startRes.status}`)

  const { job_id: jobId, session_id: startSid } = (await startRes.json()) as {
    job_id?: string
    session_id?: string
  }
  if (!jobId) throw new Error('Chat failed: no job id')

  // Event-carried session ids WIN over the start echo: the start response just
  // echoes the session we asked to resume, but if that resume fails the relay
  // starts a fresh session whose real id only arrives in the event stream.
  let newSessionId: string | null = null
  let cursor = 0
  const deadline = Date.now() + OVERALL_DEADLINE_MS

  while (true) {
    if (Date.now() > deadline) {
      throw new Error('Chat timed out — the turn ran too long. Try again.')
    }

    const res = await fetch(
      `/api/relay/${projectId}/chat/poll?job_id=${jobId}&cursor=${cursor}`,
      {
        headers: { 'x-csrf-token': getCsrf() },
        cache: 'no-store',
        // Codex review 2026-08-08: bound each poll by the remaining overall
        // deadline so a hung poll can't outlive the 5-min cap.
        signal: AbortSignal.timeout(Math.max(1_000, Math.min(15_000, deadline - Date.now()))),
      }
    )
    if (res.status === 404) throw new Error('Chat job expired — please retry.')
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`)

    const data = (await res.json()) as {
      events?: Record<string, unknown>[]
      next_cursor?: number
      done?: boolean
    }

    const events = Array.isArray(data.events) ? data.events : []
    for (const event of events) {
      if (event.session_id && !newSessionId) newSessionId = event.session_id as string
      onChunk(event)
    }
    // Codex review 2026-08-08: cursor must be a safe int and never regress —
    // a malformed relay response would otherwise replay/duplicate events.
    if (Number.isSafeInteger(data.next_cursor) && (data.next_cursor as number) >= cursor) {
      cursor = data.next_cursor as number
    }

    if (data.done) break
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }

  return newSessionId ?? startSid ?? null
}
