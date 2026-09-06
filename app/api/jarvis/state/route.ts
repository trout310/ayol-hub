import { NextResponse } from 'next/server'

// Last state the Studio reported (+ whether it is online) — read-only.
const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

export async function GET() {
  if (!RELAY_SECRET) {
    return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  }
  try {
    const res = await fetch(`${RELAY_URL}/ha/jarvis/state`, {
      headers: { Authorization: `Bearer ${RELAY_SECRET}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Relay unavailable' }, { status: 503 })
  }
}
