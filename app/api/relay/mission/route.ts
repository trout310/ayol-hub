import { NextResponse } from 'next/server'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

export async function GET() {
  try {
    const res = await fetch(`${RELAY_URL}/mission/summary`, {
      headers: { Authorization: `Bearer ${RELAY_SECRET}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Relay: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
