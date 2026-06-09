import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const res = await fetch(`${RELAY_URL}/mission/action`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RELAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Relay unavailable' }, { status: 503 })
  }
}
