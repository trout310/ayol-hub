import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''
const SAFE_PROJECT = /^[a-z][a-z0-9-]+$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ project: string }> }
) {
  if (!RELAY_SECRET) return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  const { project } = await params
  if (!SAFE_PROJECT.test(project)) return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  try {
    const res = await fetch(`${RELAY_URL}/hub/learnings/${encodeURIComponent(project)}`, {
      headers: { Authorization: `Bearer ${RELAY_SECRET}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return NextResponse.json({ error: `Relay: ${res.status}` }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Relay unavailable' }, { status: 503 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ project: string }> }
) {
  if (!RELAY_SECRET) return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  const { project } = await params
  if (!SAFE_PROJECT.test(project)) return NextResponse.json({ error: 'Invalid project' }, { status: 400 })

  // CSRF check
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('hub_csrf')?.value ?? ''
  const csrfHeader = req.headers.get('x-csrf-token') ?? ''
  if (!csrfCookie || csrfCookie !== csrfHeader) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  try {
    const res = await fetch(`${RELAY_URL}/hub/learnings/${encodeURIComponent(project)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RELAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return NextResponse.json({ error: `Relay: ${res.status}` }, { status: res.status })
    return NextResponse.json(await res.json())
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Relay unavailable' }, { status: 503 })
  }
}
