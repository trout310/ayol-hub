'use client'
import { useEffect, useState, useCallback } from 'react'

interface RetroData {
  week: string
  spend: {
    total_usd: number
    by_goal: Array<{ goal: string; spend_usd: number }>
  }
  actions: {
    total: number
    by_verb: Record<string, number>
  }
  tier3: {
    approved: number
    rejected: number
  }
  fleet: {
    total: number
    active: number
    paused: number
  }
  learning_health_headline: string
  notes: string[]
  as_of: string
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-lg text-slate-200">{value}</span>
      {sub && <span className="font-mono text-[10px] text-slate-600">{sub}</span>}
    </div>
  )
}

export default function WeeklyRetro() {
  const [retro, setRetro] = useState<RetroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchRetro = useCallback(async () => {
    try {
      const res = await fetch('/api/relay/mission/retro', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setRetro(data)
    } catch {
      // silent — retro is non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRetro()
  }, [fetchRetro])

  if (loading) return null
  if (!retro) return null

  const totalActions = retro.actions.total
  const verbEntries = Object.entries(retro.actions.by_verb).sort((a, b) => b[1] - a[1])

  return (
    <div className="glass hud-corners p-5">
      <button
        className="flex w-full items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="hud-label">Weekly Retro</span>
          <span className="font-mono text-xs text-slate-500">{retro.week}</span>
        </div>
        <span className="font-mono text-xs text-slate-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-5 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Spend"
              value={`$${retro.spend.total_usd.toFixed(2)}`}
              sub="this week"
            />
            <Stat
              label="Actions"
              value={totalActions}
              sub={`${retro.tier3.approved + retro.tier3.rejected} tier3 resolved`}
            />
            <Stat
              label="Fleet"
              value={retro.fleet.active}
              sub={`${retro.fleet.paused} paused of ${retro.fleet.total}`}
            />
            <Stat
              label="Tier3"
              value={`${retro.tier3.approved}✓ ${retro.tier3.rejected}✗`}
              sub="approved / rejected"
            />
          </div>

          {/* Spend by goal */}
          {retro.spend.by_goal.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs text-cyan-400/70 uppercase tracking-wider">
                Spend by goal
              </p>
              <div className="space-y-1">
                {retro.spend.by_goal.map((row) => (
                  <div key={row.goal} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 truncate flex-1 mr-4">{row.goal}</span>
                    <span className="text-slate-400 shrink-0">${row.spend_usd.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions breakdown */}
          {verbEntries.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-xs text-cyan-400/70 uppercase tracking-wider">
                Commands issued
              </p>
              <div className="flex flex-wrap gap-2">
                {verbEntries.map(([verb, count]) => (
                  <span
                    key={verb}
                    className="rounded border border-slate-700 bg-slate-900/60 px-2 py-0.5 font-mono text-xs text-slate-300"
                  >
                    {verb} ×{count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Learning health */}
          <div className="border-t border-slate-800 pt-4">
            <p className="mb-1 font-mono text-xs text-cyan-400/70 uppercase tracking-wider">
              Learning health
            </p>
            <p className="font-mono text-xs text-slate-400">{retro.learning_health_headline}</p>
          </div>

          {/* Notes */}
          {retro.notes.length > 0 && (
            <div className="border-t border-slate-800 pt-4">
              {retro.notes.map((n, i) => (
                <p key={i} className="font-mono text-xs text-yellow-400/80">⚠ {n}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
