import { NextResponse } from 'next/server'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

export async function GET() {
  if (!RELAY_SECRET) {
    return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  }
  try {
    const res = await fetch(`${RELAY_URL}/mission/audit`, {
      headers: { Authorization: `Bearer ${RELAY_SECRET}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Relay: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Relay unavailable' }, { status: 503 })
  }
}
