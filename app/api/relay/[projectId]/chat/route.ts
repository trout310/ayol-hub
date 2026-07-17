import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// A JARVIS "task" runs an agentic tool-use loop that routinely takes longer than
// Vercel's default 10s function limit — the function was being killed mid-stream,
// so a plain question answered but a task went silent. 60s is the Hobby ceiling
// (raise if this project moves to Pro). Streaming still flushes partial output as
// it arrives, so anything under the ceiling shows progress instead of nothing.
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''
const SAFE_PROJECT = /^[a-z][a-z0-9-]+$/

interface Params {
  projectId: string
}

export async function POST(
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

  // CSRF: X-CSRF-Token header must match hub_csrf cookie (mirrors sibling mutating routes)
  const csrfHeader = req.headers.get('x-csrf-token') ?? ''
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('hub_csrf')?.value ?? ''
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    return new Response(JSON.stringify({ error: 'CSRF mismatch' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(`${RELAY_URL}/projects/${encodeURIComponent(projectId)}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RELAY_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Relay: ${res.status}` }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // no-transform + X-Accel-Buffering:no tell intermediary proxies not to buffer
  // the stream, so text deltas reach the browser as they arrive (not all at once
  // at the end — which reads as a hang during a long task).
  return new Response(res.body, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
