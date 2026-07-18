'use client'
import { useEffect, useState, useCallback } from 'react'

interface AuditEntry {
  ts: string
  verb: string
  target: string
  result: string
  actor: string
}

const SUCCESS_PREFIXES = ['paused', 'resumed', 'woke', 'approved', 'rejected', 'ok', 'not paused']

function isSuccess(result: string): boolean {
  const lower = result.toLowerCase()
  return SUCCESS_PREFIXES.some((p) => lower.startsWith(p))
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

interface Props {
  refreshTick?: number
}

export default function CommandOutbox({ refreshTick }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/relay/mission/audit', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      // entries are in file order (oldest first); take last 20 and reverse for newest-first display
      const all: AuditEntry[] = data.entries ?? []
      setEntries([...all].slice(-20).reverse())
    } catch {
      // silent — outbox is non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit, refreshTick])

  useEffect(() => {
    const interval = setInterval(fetchAudit, 30_000)
    return () => clearInterval(interval)
  }, [fetchAudit])

  return (
    <div className="glass hud-corners p-5">
      <p className="hud-label mb-4">Command Outbox</p>
      {loading ? (
        <p className="font-mono text-xs text-slate-600">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="font-mono text-xs text-slate-600">No commands issued yet</p>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {entries.map((e, i) => (
            <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs font-mono">
              <span className="text-slate-600 shrink-0 w-20">{formatTs(e.ts)}</span>
              <span className="text-cyan-400 shrink-0 w-14">{e.verb}</span>
              <span className="text-slate-300 truncate flex-1 min-w-0" title={e.target}>
                {e.target}
              </span>
              <span
                className={`w-full shrink-0 truncate sm:w-auto sm:max-w-[140px] ${isSuccess(e.result) ? 'text-green-400' : 'text-red-400'}`}
                title={e.result}
              >
                {e.result.length > 30 ? e.result.slice(0, 30) + '…' : e.result}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
