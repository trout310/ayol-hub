'use client'
import { useState, useCallback } from 'react'

function getCsrf(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)hub_csrf=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export interface ActionResult {
  ok: boolean
  result: string
  verb: string
  target: string
  ts: string
}

export function useAction() {
  const [loading, setLoading] = useState(false)

  const execute = useCallback(
    async (
      verb: string,
      target: string,
      params?: Record<string, unknown>
    ): Promise<ActionResult> => {
      setLoading(true)
      try {
        const res = await fetch('/api/relay/mission/action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrf(),
          },
          body: JSON.stringify({ verb, target, params: params ?? {} }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { ok: false, result: data.error ?? `HTTP ${res.status}`, verb, target, ts: new Date().toISOString() }
        }
        return data as ActionResult
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Action failed'
        return { ok: false, result: msg, verb, target, ts: new Date().toISOString() }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { execute, loading }
}
