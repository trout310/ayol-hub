import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'hub_auth'

// Must match middleware.ts exactly — same salt, same algorithm. Built from the
// ENV username (normalized) + ENV password so the cookie always matches what the
// middleware re-derives, regardless of which accepted alias the user typed.
async function token(): Promise<string> {
  const user = (process.env.HUB_USERNAME ?? '').trim().toLowerCase()
  const pw = process.env.HUB_PASSWORD ?? ''
  const data = new TextEncoder().encode(`${user}:${pw}:ayol-hub-v2`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Accept the configured username case-insensitively, plus its local-part alias
// (e.g. "aaron" for "aaron@ayol.net").
function usernameMatches(submitted: string): boolean {
  const expected = (process.env.HUB_USERNAME ?? '').trim().toLowerCase()
  if (!expected) return false
  const given = submitted.trim().toLowerCase()
  const localPart = expected.includes('@') ? expected.split('@')[0] : expected
  return given === expected || given === localPart
}

export async function POST(req: NextRequest) {
  let username = ''
  let password = ''
  try {
    const body = await req.json()
    username = typeof body.username === 'string' ? body.username : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const expectedPw = process.env.HUB_PASSWORD ?? ''
  if (!expectedPw || password !== expectedPw || !usernameMatches(username)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const tok = await token()
  // CSRF token is independent from the auth token — same lifetime, different value.
  // Non-HttpOnly so JS can read it and echo as X-CSRF-Token on mutations.
  const csrf = crypto.randomUUID().replace(/-/g, '')
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, tok, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  res.cookies.set('hub_csrf', csrf, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
