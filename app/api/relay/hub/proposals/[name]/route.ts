import { NextRequest, NextResponse } from 'next/server'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''
const SAFE_NAME = /^[A-Za-z0-9_-]+$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  if (!RELAY_SECRET) return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  const { name } = await params
  if (!SAFE_NAME.test(name)) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
  try {
    const res = await fetch(`${RELAY_URL}/hub/proposals/${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${RELAY_SECRET}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return NextResponse.json({ error: `Relay: ${res.status}` }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Relay unavailable' }, { status: 503 })
  }
}
