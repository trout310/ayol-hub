'use client'

interface AttentionItem {
  severity: string
  category: string
  title: string
  source: string
}

interface Props {
  items: AttentionItem[]
}

const severityColor: Record<string, string> = {
  critical: 'text-red-400',
  warn: 'text-yellow-400',
  info: 'text-cyan-400',
}

const borderColor: Record<string, string> = {
  critical: 'border-red-500',
  warn: 'border-yellow-500',
  info: 'border-cyan-500',
}

export default function NeedsAttention({ items }: Props) {
  return (
    <div className="glass hud-corners p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="hud-label">Needs Attention</span>
        {items.length > 0 && (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 font-mono text-xs text-red-400 border border-red-500/30">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-green-400 font-mono text-sm">
          <span>✓</span>
          <span>All systems nominal — nothing needs your attention</span>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={`border-l-2 pl-3 py-1 ${borderColor[item.severity] ?? 'border-slate-500'}`}
            >
              <p className={`text-sm ${severityColor[item.severity] ?? 'text-slate-300'}`}>
                {item.title}
              </p>
              <p className="font-mono text-xs text-slate-500 mt-0.5">{item.source}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
