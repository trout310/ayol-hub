import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hub_auth'

// Derive a cookie token from the username + password. Neither is stored in the
// cookie — only this hash, which the middleware re-derives and compares. The
// username is normalized (trim + lowercase) so it's case-insensitive. Runs on
// the edge runtime (Web Crypto is available there). Salt is v2 (was v1 before
// username was added) so any pre-username cookie is invalidated.
async function expectedToken(): Promise<string> {
  const user = (process.env.HUB_USERNAME ?? '').trim().toLowerCase()
  const pw = process.env.HUB_PASSWORD ?? ''
  const data = new TextEncoder().encode(`${user}:${pw}:ayol-hub-v2`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths: the login page and the login API must be reachable
  // without a cookie, or there's no way to ever authenticate.
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login')) {
    return NextResponse.next()
  }

  // Fail closed: if the credentials aren't configured, never authenticate (a
  // missing env var would otherwise make expectedToken() a fixed, guessable hash).
  const configured = !!(process.env.HUB_USERNAME && process.env.HUB_PASSWORD)

  const cookie = req.cookies.get(COOKIE)?.value
  const expected = await expectedToken()

  if (configured && cookie && cookie === expected) {
    const res = NextResponse.next()
    // Self-heal CSRF for sessions that predate the CSRF cookie: a long-lived
    // hub_auth (30-day) issued before CSRF shipped has no hub_csrf, so the
    // mutating routes (chat/reminders/learnings — they require
    // X-CSRF-Token === hub_csrf) 403 with a cryptic "CSRF mismatch" and no hint
    // to re-login. Mint hub_csrf here when it's absent on an already-authenticated
    // request so a plain page load fixes it (no re-login needed). Mirrors the
    // options in app/api/login/route.ts exactly. Only set when missing — never
    // overwrites a valid token, so there's no churn and no effect on healthy
    // sessions.
    if (!req.cookies.get('hub_csrf')?.value) {
      res.cookies.set('hub_csrf', crypto.randomUUID().replace(/-/g, ''), {
        httpOnly: false,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days — same lifetime as hub_auth
      })
    }
    return res
  }

  // Unauthenticated. API routes get a clean 401; pages get redirected to login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

export const config = {
  // Protect everything except Next internals and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
