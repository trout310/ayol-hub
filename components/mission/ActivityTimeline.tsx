'use client'
import { useEffect, useState } from 'react'

interface TimelineEvent {
  ts: string
  source: string
  task_id: string
  outcome: string
  duration_ms: number | null
  action: string
}

const OUTCOME_COLORS: Record<string, string> = {
  FIXED: 'text-emerald-400',
  ESCALATE: 'text-red-400',
  UNPARSEABLE: 'text-yellow-400',
  NO_ACTION: 'text-slate-500',
  UNKNOWN: 'text-slate-500',
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts)
    const now = new Date()
    const diffH = (now.getTime() - d.getTime()) / 3600000
    if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return ts }
}

function shortSource(s: string): string {
  return s.replace(/^(com\.|net\.|ayol\.|aaronyoung\.)/, '').replace(/-/g, ' ')
}

export default function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/relay/mission/timeline')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const visible = expanded ? events : events.slice(0, 10)

  return (
    <div className="glass rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="hud-label">Activity Timeline</p>
        {events.length > 10 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="font-mono text-xs text-cyan-400/70 hover:text-cyan-300 transition-colors"
          >
            {expanded ? 'show less' : `show all ${events.length}`}
          </button>
        )}
      </div>

      {loading && <p className="hud-label text-slate-500">Loading…</p>}
      {error && <p className="hud-label text-red-400/70">{error}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="hud-label text-slate-500">No events recorded</p>
      )}

      <div className="space-y-1">
        {visible.map((ev, i) => (
          <div key={i} className="flex flex-wrap gap-x-2 gap-y-0.5 py-1 border-b border-white/5 last:border-0 items-baseline">
            <span className="font-mono text-xs text-slate-500 shrink-0 w-16 sm:w-24">{formatTs(ev.ts)}</span>
            <span className="font-mono text-xs text-slate-400 shrink-0 w-24 truncate sm:w-28" title={ev.source}>
              {shortSource(ev.source)}
            </span>
            <span className={`font-mono text-xs shrink-0 w-20 sm:w-24 ${OUTCOME_COLORS[ev.outcome] ?? 'text-slate-400'}`}>
              {ev.outcome}
            </span>
            {ev.action && (
              <span className="w-full truncate font-mono text-xs text-slate-500 sm:w-auto sm:flex-1" title={ev.action}>
                {ev.action}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
