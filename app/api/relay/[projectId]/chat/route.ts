import { NextRequest } from 'next/server'

const RELAY_URL = process.env.RELAY_URL ?? 'https://miniassts-mac-mini.taild32851.ts.net:8443'
const RELAY_SECRET = process.env.HUB_RELAY_SECRET ?? ''

interface Params {
  projectId: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { projectId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(`${RELAY_URL}/projects/${projectId}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RELAY_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `Relay: ${res.status}` }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(res.body, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}
