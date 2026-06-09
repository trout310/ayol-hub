'use client'
import { useEffect, useState } from 'react'

interface GoalData {
  id: string
  title: string
  agent_count: number
  active: number
  paused: number
  today_spend_usd: number
  failures_24h: number
}

function healthColor(failures: number): string {
  if (failures === 0) return 'border-emerald-500/30 bg-emerald-950/20'
  if (failures <= 2) return 'border-yellow-500/30 bg-yellow-950/20'
  return 'border-red-500/30 bg-red-950/20'
}

function healthDot(failures: number): string {
  if (failures === 0) return 'bg-emerald-400'
  if (failures <= 2) return 'bg-yellow-400'
  return 'bg-red-400'
}

export default function GoalsOverview() {
  const [goals, setGoals] = useState<GoalData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/relay/mission/goals')
      .then(r => r.json())
      .then(d => { setGoals(d.goals ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <div className="glass rounded-xl p-4">
      <p className="hud-label mb-3">Goals Overview</p>

      {loading && <p className="hud-label text-slate-500">Loading…</p>}
      {error && <p className="hud-label text-red-400/70">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {goals.map(g => (
          <div
            key={g.id}
            className={`rounded-lg border p-3 ${healthColor(g.failures_24h)}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${healthDot(g.failures_24h)}`} />
              <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider truncate">
                {g.id.replace('G-', '')}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-tight mb-2 line-clamp-2">{g.title}</p>
            <div className="space-y-0.5">
              <p className="font-mono text-[10px] text-slate-500">
                {g.active}/{g.agent_count} active
                {g.paused > 0 && <span className="text-yellow-400/70"> · {g.paused} paused</span>}
              </p>
              {g.today_spend_usd > 0 && (
                <p className="font-mono text-[10px] text-cyan-400/70">
                  ${g.today_spend_usd.toFixed(4)} today
                </p>
              )}
              {g.failures_24h > 0 && (
                <p className="font-mono text-[10px] text-red-400/80">
                  {g.failures_24h} failure{g.failures_24h !== 1 ? 's' : ''} 24h
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
