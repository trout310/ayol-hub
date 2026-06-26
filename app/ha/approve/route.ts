import { NextRequest } from 'next/server'

// One-tap HA approval landing page.
//
// SECURITY — three layers (all must hold), per
// ~/ClaudeHub/_global/specs/one-tap-ha-approval.md:
//   1. Cookie auth: this route sits behind middleware.ts (the matcher protects
//      everything except _next/* and favicon, so /ha/approve requires Aaron's
//      hub_auth cookie). A leaked URL alone cannot reach this handler.
//   2. HMAC token: `t` is HMAC-SHA256(ha-gateway-secret, "<nonce>:<code>"),
//      issued by the gateway, with a per-pending random nonce `n` so a stale
//      link for a recycled code can't approve a later action. The gateway
//      recomputes + constant-time-compares it. The secret never leaves the
//      Mini — this route only forwards c+n+t.
//   3. One-time + 24h: the gateway consumes the pending code on confirm.
//
// Flow: browser (cookie-authed) -> this route -> Tailscale funnel ->
//       Mini hub-relay /ha/confirm-link (Bearer) -> gateway /confirm-link
//       (X-Gateway-Key + HMAC). This is a GET (a tap on a texted link), so the
//       CSRF-token check used by mutating POST routes does not apply; the cookie
//       gate is the request's auth.

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

function page(icon: string, title: string, detail: string): Response {
  // Escape any gateway-provided text so it stays inert in the page.
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HA Confirmation</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #111;
         color: #eee; display: flex; min-height: 100vh; align-items: center;
         justify-content: center; margin: 0; }
  .card { background: #1c1c1e; border-radius: 14px; padding: 28px 24px;
          max-width: 420px; margin: 16px; text-align: center; }
  .icon { font-size: 44px; }
  h1 { font-size: 19px; margin: 12px 0 8px; }
  p { color: #b0b0b5; font-size: 15px; line-height: 1.45; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${esc(icon)}</div>
    <h1>${esc(title)}</h1>
    <p>${esc(detail)}</p>
  </div>
</body>
</html>`
  // Always 200 so the page renders in the browser; the title/icon convey the
  // approve/expired/invalid outcome.
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

export async function GET(req: NextRequest) {
  if (!RELAY_SECRET) {
    return page('⚠️', 'Not configured', 'The approval relay is not configured.')
  }

  const code = req.nextUrl.searchParams.get('c') ?? ''
  const nonce = req.nextUrl.searchParams.get('n') ?? ''
  const token = req.nextUrl.searchParams.get('t') ?? ''
  if (!code || !nonce || !token) {
    return page('✗', 'Invalid link', 'This approval link is missing its code, nonce, or token.')
  }

  let res: Response
  try {
    res = await fetch(`${RELAY_URL}/ha/confirm-link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RELAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, nonce, token }),
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    return page('⚠️', 'Unavailable', 'Could not reach the gateway. Try the "approve <code>" reply instead.')
  }

  let data: { summary?: string; detail?: string; status?: string } = {}
  try {
    data = await res.json()
  } catch {
    /* non-JSON body — fall through to generic messaging */
  }
  const summary = data.summary || data.detail || ''

  if (res.ok) {
    return page('✅', 'Approved', summary ? `Executed: ${summary}` : 'The action has been executed.')
  }
  if (res.status === 403) {
    return page('✗', 'Invalid', 'This approval link is invalid (bad token).')
  }
  if (res.status === 404 || res.status === 410) {
    return page('⏰', 'Expired or already used', 'This approval has expired (24h) or was already approved.')
  }
  return page('✗', 'Not approved', summary || `The gateway returned an error (HTTP ${res.status}).`)
}
