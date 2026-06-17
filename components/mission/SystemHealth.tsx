'use client'

import { useState, useEffect } from 'react'

interface DaemonExit {
  label: string
  exit_code: number
}

interface CostPoint {
  date: string
  spend_usd: number
}

interface Props {
  health: {
    self_heal_failure_count_24h: number
    daemon_nonzero_exits: DaemonExit[]
    daemon_invariant_failures?: { label: string; detail: string }[]
    pa_queue_depth: number
    disk_free_gb: number | null
    cost_trend_7d: CostPoint[]
    notes: string[]
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-800/50 last:border-0">
      <span className="w-32 shrink-0 font-mono text-xs text-slate-500 mt-0.5">{label}</span>
      <div className="flex-1 font-mono text-xs">{children}</div>
    </div>
  )
}

export default function SystemHealth({ health }: Props) {
  const diskColor =
    health.disk_free_gb === null
      ? 'text-slate-400'
      : health.disk_free_gb < 5
      ? 'text-red-400'
      : health.disk_free_gb < 10
      ? 'text-yellow-400'
      : 'text-green-400'

  // Collapsed state persists across reloads (Aaron 2026-06-14: "be able to
  // minimize it and expand it" — component-local state reset on every refresh).
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try { const v = localStorage.getItem('mc:health:collapsed'); if (v !== null) setCollapsed(v === '1') } catch {}
  }, [])
  const toggle = () => setCollapsed(c => {
    const n = !c
    try { localStorage.setItem('mc:health:collapsed', n ? '1' : '0') } catch {}
    return n
  })

  return (
    <div className="glass hud-corners p-5">
      <div className="mb-4">
        <button onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}
          className="flex items-center gap-2 hud-label hover:text-cyan-300 cursor-pointer">
          <span className={`text-cyan-400/70 text-xs transition-transform ${collapsed ? "" : "rotate-90"}`}>▸</span>
          System Health
          <span className="ml-1 text-[10px] text-slate-600">{collapsed ? '(show)' : '(hide)'}</span>
        </button>
      </div>

      {!collapsed && (<>
      <div className="space-y-0">
        <Row label="Failures 24h">
          <span className={health.self_heal_failure_count_24h > 0 ? 'text-red-400' : 'text-green-400'}>
            {health.self_heal_failure_count_24h}
          </span>
        </Row>

        <Row label="Non-zero daemons">
          {health.daemon_nonzero_exits.length === 0 ? (
            <span className="text-slate-500">None</span>
          ) : (
            <div className="space-y-0.5">
              {health.daemon_nonzero_exits.map((d, i) => (
                <div key={i} className="text-yellow-400">
                  {d.label} <span className="text-slate-600">[{d.exit_code}]</span>
                </div>
              ))}
            </div>
          )}
        </Row>

        <Row label="Hung daemons">
          {(health.daemon_invariant_failures ?? []).length === 0 ? (
            <span className="text-green-400">None</span>
          ) : (
            <div className="space-y-0.5">
              {(health.daemon_invariant_failures ?? []).map((d, i) => (
                <div key={i} className="text-red-400">
                  {d.label} <span className="text-slate-600">[{d.detail}]</span>
                </div>
              ))}
            </div>
          )}
        </Row>

        <Row label="PA queue">
          <span className="text-slate-300">{health.pa_queue_depth}</span>
        </Row>

        <Row label="Disk free">
          <span className={diskColor}>
            {health.disk_free_gb !== null ? `${health.disk_free_gb.toFixed(1)} GB` : 'unknown'}
          </span>
        </Row>

        <Row label="Cost 7d">
          {health.cost_trend_7d.length === 0 ? (
            <span className="text-slate-500">No data</span>
          ) : (
            <div className="space-y-0.5">
              {health.cost_trend_7d.map((pt, i) => (
                <div key={i} className="text-slate-400">
                  {pt.date} <span className="text-cyan-400/70">${pt.spend_usd.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Row>
      </div>

      {health.notes.length > 0 && (
        <div className="mt-3 space-y-1">
          {health.notes.map((note, i) => (
            <p key={i} className="font-mono text-xs italic text-yellow-400">
              {note}
            </p>
          ))}
        </div>
      )}
      </>)}
    </div>
  )
}
