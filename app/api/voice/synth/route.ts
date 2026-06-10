import { NextRequest, NextResponse } from 'next/server'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const rawText = (body as { text?: unknown })?.text
  if (typeof rawText !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const text = rawText.trim()
  if (!text) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }
  if (text.length > 800) {
    return NextResponse.json({ error: 'text too long' }, { status: 413 })
  }

  try {
    const res = await fetch(`${RELAY_URL}/voice/synth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RELAY_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 503 })
    }

    return new Response(res.body, {
      headers: { 'Content-Type': 'audio/wav' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
