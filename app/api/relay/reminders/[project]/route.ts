import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

interface Params {
  project: string
}

const SAFE_PROJECT = /^[A-Za-z0-9_-]+$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  if (!RELAY_SECRET) {
    return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  }
  const { project } = await params
  if (!SAFE_PROJECT.test(project)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }
  try {
    const res = await fetch(`${RELAY_URL}/reminders/${encodeURIComponent(project)}`, {
      headers: { Authorization: `Bearer ${RELAY_SECRET}` },
      signal: AbortSignal.timeout(12_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Relay unavailable' }, { status: 503 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  if (!RELAY_SECRET) {
    return NextResponse.json({ error: 'Relay not configured' }, { status: 503 })
  }

  const csrfHeader = req.headers.get('x-csrf-token') ?? ''
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get('hub_csrf')?.value ?? ''
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    return NextResponse.json({ error: 'CSRF mismatch' }, { status: 403 })
  }

  const { project } = await params
  if (!SAFE_PROJECT.test(project)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const res = await fetch(`${RELAY_URL}/reminders/${encodeURIComponent(project)}/action`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RELAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Relay unavailable' }, { status: 503 })
  }
}
