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
// PREFETCH SAFETY (2026-08-06): the pending is one-time and is CONSUMED by the
// gateway's /confirm-link. HTTP GET is "safe"/idempotent by spec: Safari and
// iMessage prefetch and can duplicate a single tap into several GETs. If the
// GET consumed the pending, the first (often invisible, prefetch) request would
// approve+execute and every later duplicate — including the one whose response
// the browser actually renders — would return 404 "expired", so Aaron sees
// "Expired" even though the action ran. Fix: GET only RENDERS a confirm page
// with an explicit Approve button; only the button's POST consumes. POST is
// never prefetched, so a single deliberate action = a single consume.

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

function page(icon: string, title: string, detail: string, bodyExtra = ''): Response {
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
  button { margin-top: 20px; width: 100%; padding: 14px 18px; font-size: 17px;
           font-weight: 600; color: #fff; background: #0a84ff; border: 0;
           border-radius: 12px; cursor: pointer; -webkit-appearance: none; }
  button:active { background: #0060df; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${esc(icon)}</div>
    <h1>${esc(title)}</h1>
    <p>${esc(detail)}</p>
    ${bodyExtra}
  </div>
</body>
</html>`
  // Always 200 so the page renders in the browser; the title/icon convey the
  // approve/expired/invalid outcome.
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Belt-and-suspenders: never let a shared cache serve this page.
      'cache-control': 'no-store',
    },
  })
}

// GET = show the confirm page with an Approve button. It NEVER consumes the
// pending — a prefetch or a duplicated tap just re-renders the same button.
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
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  // Hidden fields carry c/n/t forward; the POST (below) is what consumes.
  const form = `<form method="POST" action="/ha/approve">
      <input type="hidden" name="c" value="${esc(code)}">
      <input type="hidden" name="n" value="${esc(nonce)}">
      <input type="hidden" name="t" value="${esc(token)}">
      <button type="submit">Approve</button>
    </form>`
  return page('🔐', 'Confirm Home Assistant action',
    'Tap Approve to run the gated action. This link is single-use and expires in 24 hours.',
    form)
}

// POST = the explicit Approve button. This is the ONLY place that consumes the
// one-time pending. POST is never prefetched, so one tap = one consume.
export async function POST(req: NextRequest) {
  if (!RELAY_SECRET) {
    return page('⚠️', 'Not configured', 'The approval relay is not configured.')
  }
  const fd = await req.formData()
  const code = String(fd.get('c') ?? '')
  const nonce = String(fd.get('n') ?? '')
  const token = String(fd.get('t') ?? '')
  if (!code || !nonce || !token) {
    return page('✗', 'Invalid link', 'This approval request is missing its code, nonce, or token.')
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
