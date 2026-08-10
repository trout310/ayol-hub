import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Poll half of the async job+poll chat (see ../route.ts). Each call proxies one
// cheap since-cursor read of the relay's buffered job events — always sub-second,
// so the 60s function ceiling can never kill a long JARVIS turn again.
export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''
const SAFE_PROJECT = /^[a-z][a-z0-9-]+$/
const SAFE_JOB = /^[a-f0-9]{32}$/

interface Params {
  projectId: string
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  if (!RELAY_SECRET) {
    return new Response(JSON.stringify({ error: 'Relay not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { projectId } = await params
  if (!SAFE_PROJECT.test(projectId)) {
    return new Response(JSON.stringify({ error: 'Invalid project id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // CSRF: mirrors the start route. A GET that proxies an authenticated upstream
  // read keeps the same header check so the relay is never reachable from a bare
  // cross-site request.
  const csrfHeader = req.headers.get('x-csrf-token') ?? ''
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('hub_csrf')?.value ?? ''
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    return new Response(JSON.stringify({ error: 'CSRF mismatch' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const jobId = req.nextUrl.searchParams.get('job_id') ?? ''
  if (!SAFE_JOB.test(jobId)) {
    return new Response(JSON.stringify({ error: 'Invalid job id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // Codex review 2026-08-08: strict unsigned-int cursor (reject, don't coerce).
  const cursorRaw = req.nextUrl.searchParams.get('cursor') ?? '0'
  if (!/^\d{1,9}$/.test(cursorRaw)) {
    return new Response(JSON.stringify({ error: 'Invalid cursor' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const cursor = Number.parseInt(cursorRaw, 10)

  // Codex review 2026-08-08: explicit timeout + guarded parse so a stalled or
  // non-JSON relay yields a clean 502/503 instead of an uncaught 500.
  try {
    const res = await fetch(
      `${RELAY_URL}/projects/${encodeURIComponent(projectId)}/chat/poll?job_id=${jobId}&cursor=${cursor}`,
      {
        headers: { Authorization: `Bearer ${RELAY_SECRET}` },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Relay: ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Relay unreachable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
