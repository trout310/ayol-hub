'use client'

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
}

export default function Fleet({ fleet }: Props) {
  const spendText =
    fleet.global_spend_usd !== null ? `$${fleet.global_spend_usd.toFixed(2)}` : 'unknown'

  return (
    <div className="glass hud-corners p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="hud-label">Fleet</span>
        <span className="font-mono text-xs text-slate-500">
          global spend today: {spendText}
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(fleet.by_goal).map(([goal, agents]) => (
          <div key={goal}>
            <p className="mb-1.5 font-mono text-xs text-cyan-400/70 uppercase tracking-wider">
              {goal}
            </p>
            <div className="space-y-1">
              {agents.map((agent, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-slate-900/40 border border-slate-800/50 text-sm"
                >
                  <span className="flex-1 truncate text-slate-200" title={agent.label}>
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
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(fleet.by_goal).length === 0 && (
          <p className="font-mono text-xs text-slate-600">No agents registered</p>
        )}
      </div>
    </div>
  )
}
