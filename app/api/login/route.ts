import { NextRequest, NextResponse } from 'next/server'

// Must match middleware.ts exactly — same salt, same algorithm.
async function token(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw + ':ayol-hub-v1')
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function POST(req: NextRequest) {
  let password = ''
  try {
    const body = await req.json()
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const expected = process.env.HUB_PASSWORD ?? ''
  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, await token(password), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}

const COOKIE_NAME = 'hub_auth'
