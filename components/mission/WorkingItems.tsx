'use client'

interface WorkingItem {
  id: string
  title: string
  detail?: string
  project?: string
  category?: string
  status: 'pending' | 'in_progress' | 'blocked' | 'resolved'
  since?: string
}

interface Props {
  items: WorkingItem[]
}

const statusDot: Record<string, string> = {
  pending: 'bg-slate-500',
  in_progress: 'bg-cyan-400',
  blocked: 'bg-yellow-400',
  resolved: 'bg-green-500/60',
}

const statusLabel: Record<string, string> = {
  pending: 'queued',
  in_progress: 'in progress',
  blocked: 'blocked',
  resolved: 'resolved',
}

export default function WorkingItems({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="glass hud-corners p-5">
      <div className="mb-4">
        <span className="hud-label">Background Queue</span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isResolved = item.status === 'resolved'
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 ${isResolved ? 'opacity-50' : ''}`}
            >
              <div className="mt-1.5 shrink-0">
                <div className={`h-1.5 w-1.5 rounded-full ${statusDot[item.status] ?? 'bg-slate-500'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm text-slate-300">{item.title}</p>
                  {item.project && (
                    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-500 border border-slate-700">
                      {item.project}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-slate-600">
                    {statusLabel[item.status] ?? item.status}
                  </span>
                </div>
                {item.detail && (
                  <p className="mt-0.5 font-mono text-xs text-slate-500">{item.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
