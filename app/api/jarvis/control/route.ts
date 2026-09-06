import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Studio-Jarvis remote control (voice-jarvis/SPEC-web-remote-control.md T4).
// Queues one command in the Mini gateway's mailbox via hub-relay; the Studio
// long-polls and applies it. Same gates as every other action: login cookie
// (middleware) → CSRF → relay bearer → gateway key.
const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

const ALLOWED_ACTIONS = new Set(['mute', 'unmute', 'listen', 'stop'])

export async function POST(req: NextRequest) {
  if (!RELAY_SECRET) {
    return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  }

  const csrfHeader = req.headers.get('x-csrf-token') ?? ''
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('hub_csrf')?.value ?? ''
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: 'CSRF mismatch' }, { status: 403 })
  }

  let body: { action?: unknown; idem?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = typeof body.action === 'string' ? body.action : ''
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
  // One idempotency key per tap (client UUID) so a retried POST cannot double-fire.
  const idem = typeof body.idem === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(body.idem) ? body.idem : ''
  if (!idem) {
    return NextResponse.json({ error: 'idem required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${RELAY_URL}/ha/jarvis/control`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RELAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, idem }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Relay unavailable' }, { status: 503 })
  }
}
