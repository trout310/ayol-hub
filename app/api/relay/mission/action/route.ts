import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

const ALLOWED_VERBS = new Set(['pause', 'resume', 'wake', 'approve', 'reject'])

export async function POST(req: NextRequest) {
  if (!RELAY_SECRET) {
    return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  }

  // CSRF: X-CSRF-Token header must match hub_csrf cookie
  const csrfHeader = req.headers.get('x-csrf-token') ?? ''
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('hub_csrf')?.value ?? ''
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: 'CSRF mismatch' }, { status: 403 })
  }

  let body: { verb?: unknown; target?: unknown; params?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Allowlist verbs at the Next.js layer too (defence-in-depth)
  const verb = typeof body.verb === 'string' ? body.verb : ''
  if (!ALLOWED_VERBS.has(verb)) {
    return NextResponse.json({ error: `Unknown verb: ${verb}` }, { status: 400 })
  }

  try {
    const res = await fetch(`${RELAY_URL}/mission/action`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RELAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Relay unavailable' }, { status: 503 })
  }
}
