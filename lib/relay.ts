import type { Project } from './projects'

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/relay/projects', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Relay error: ${res.status}`)
  return res.json()
}

export async function streamChat(
  projectId: string,
  message: string,
  sessionId: string | null,
  onChunk: (event: Record<string, unknown>) => void
): Promise<string | null> {
  const res = await fetch(`/api/relay/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })

  if (!res.ok) throw new Error(`Chat failed: ${res.status}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let newSessionId: string | null = null
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        if (event.session_id && !newSessionId) newSessionId = event.session_id as string
        onChunk(event)
      } catch {}
    }
  }

  return newSessionId
}
