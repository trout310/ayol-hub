'use client'
import { useState } from 'react'
import { useAction } from '@/lib/useAction'
import { useToast } from '@/lib/toast'
import ConfirmDialog from './ConfirmDialog'

interface AgentRow {
  label: string
  role: string
  goal: string
  status: string
  source: string
  paused: boolean
  today_spend_usd: number | null
}

interface Props {
  fleet: {
    by_goal: Record<string, AgentRow[]>
    total_agents: number
    global_spend_usd: number | null
    global_cap_usd: number | null
  }
  onActionDone?: () => void
}

interface ConfirmState {
  verb: string
  target: string
  label: string
}

export default function Fleet({ fleet, onActionDone }: Props) {
  const { execute, loading } = useAction()
  const { push } = useToast()
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busyLabel, setBusyLabel] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const spendText =
    fleet.global_spend_usd !== null ? `$${fleet.global_spend_usd.toFixed(2)}` : 'unknown'

  async function runAction(verb: string, target: string, params?: Record<string, unknown>) {
    setBusyLabel(target)
    const result = await execute(verb, target, params)
    push(result.result, result.ok)
    setBusyLabel(null)
    if (result.ok) onActionDone?.()
  }

  function requestPause(agent: AgentRow) {
    setConfirm({ verb: 'pause', target: agent.label, label: agent.label })
  }

  async function confirmAction() {
    if (!confirm) return
    const { verb, target } = confirm
    setConfirm(null)
    setBusyLabel(target)
    // Send confirmed:true — required server-side for pause
    const result = await execute(verb, target, { confirmed: true })
    push(result.result, result.ok)
    setBusyLabel(null)
    if (result.ok) onActionDone?.()
  }

  return (
    <div className="glass hud-corners p-5">
      {confirm && (
        <ConfirmDialog
          title={`Pause agent — ${confirm.label}`}
          message={`This will pause "${confirm.label}". It will stop spending until resumed.`}
          onConfirm={confirmAction}
          onCancel={() => setConfirm(null)}
          loading={loading}
        />
      )}

      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2 hud-label hover:text-cyan-300">
          <span className={`text-cyan-400/70 text-xs transition-transform ${collapsed ? "" : "rotate-90"}`}>▸</span>
          Fleet
        </button>
        <span className="font-mono text-xs text-slate-500">
          global spend today: {spendText}
        </span>
      </div>

      {!collapsed && (
      <div className="space-y-4">
        {Object.entries(fleet.by_goal).map(([goal, agents]) => (
          <div key={goal}>
            <p className="mb-1.5 font-mono text-xs text-cyan-400/70 uppercase tracking-wider">
              {goal}
            </p>
            <div className="space-y-1">
              {agents.map((agent, i) => {
                const busy = busyLabel === agent.label
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-slate-900/40 border border-slate-800/50 text-sm"
                  >
                    <span className="flex-1 truncate text-slate-200 min-w-0" title={agent.label}>
                      {agent.label}
                    </span>
                    <span className="font-mono text-xs text-slate-500 shrink-0">{agent.role}</span>
                    <span
                      className={`shrink-0 font-mono text-xs ${
                        agent.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                      }`}
                    >
                      {agent.status}
                    </span>
                    {agent.paused && (
                      <span className="shrink-0 rounded border border-yellow-500/40 bg-yellow-500/10 px-1.5 font-mono text-[10px] text-yellow-400">
                        PAUSED
                      </span>
                    )}
                    {agent.today_spend_usd !== null && (
                      <span className="shrink-0 font-mono text-xs text-slate-500">
                        ${agent.today_spend_usd.toFixed(3)}
                      </span>
                    )}
                    {/* Action buttons */}
                    <div className="flex gap-1 shrink-0 ml-1">
                      {agent.paused ? (
                        <button
                          onClick={() => runAction('resume', agent.label)}
                          disabled={busy}
                          title="Resume"
                          className="hud-btn px-1.5 py-0.5 text-[10px] text-green-400 border-green-500/40 hover:bg-green-500/10 disabled:opacity-40"
                        >
                          ▶
                        </button>
                      ) : (
                        <button
                          onClick={() => requestPause(agent)}
                          disabled={busy}
                          title="Pause"
                          className="hud-btn px-1.5 py-0.5 text-[10px] text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/10 disabled:opacity-40"
                        >
                          ⏸
                        </button>
                      )}
                      <button
                        onClick={() => runAction('wake', agent.label)}
                        disabled={busy || agent.paused}
                        title={agent.paused ? 'Resume before waking' : 'Wake now'}
                        className="hud-btn px-1.5 py-0.5 text-[10px] text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10 disabled:opacity-40"
                      >
                        ⏰
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {Object.keys(fleet.by_goal).length === 0 && (
          <p className="font-mono text-xs text-slate-600">No agents registered</p>
        )}
      </div>
      )}
    </div>
  )
}
