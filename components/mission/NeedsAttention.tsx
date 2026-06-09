'use client'
import { useState } from 'react'
import { useAction } from '@/lib/useAction'
import { useToast } from '@/lib/toast'
import ConfirmDialog from './ConfirmDialog'

interface AttentionItem {
  severity: string
  category: string
  title: string
  source: string
  id?: string
}

interface Props {
  items: AttentionItem[]
  onActionDone?: () => void
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

const ACTIONABLE_CATEGORIES = new Set(['tier3_pending'])

interface ConfirmState {
  verb: string
  target: string
  label: string
}

export default function NeedsAttention({ items, onActionDone }: Props) {
  const { execute, loading } = useAction()
  const { push } = useToast()
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function runAction(verb: string, target: string) {
    setBusyId(`${verb}:${target}`)
    const result = await execute(verb, target)
    push(result.result, result.ok)
    setBusyId(null)
    if (result.ok) onActionDone?.()
  }

  function requestAction(verb: string, target: string, label: string) {
    setConfirm({ verb, target, label })
  }

  async function confirmAction() {
    if (!confirm) return
    const { verb, target } = confirm
    setConfirm(null)
    await runAction(verb, target)
  }

  return (
    <div className="glass hud-corners p-5">
      {confirm && (
        <ConfirmDialog
          title={`${confirm.verb} — ${confirm.label}`}
          message={`Are you sure you want to ${confirm.verb} this item?`}
          onConfirm={confirmAction}
          onCancel={() => setConfirm(null)}
          loading={loading}
        />
      )}

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
          {items.map((item, i) => {
            const itemId = item.id ?? item.source
            const isBusy = busyId !== null && busyId.endsWith(`:${itemId}`)
            const showActions = ACTIONABLE_CATEGORIES.has(item.category) && itemId

            return (
              <div
                key={i}
                className={`border-l-2 pl-3 py-1.5 ${borderColor[item.severity] ?? 'border-slate-500'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm ${severityColor[item.severity] ?? 'text-slate-300'}`}>
                      {item.title}
                    </p>
                    <p className="font-mono text-xs text-slate-500 mt-0.5">{item.source}</p>
                  </div>
                  {showActions && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => requestAction('approve', itemId, item.title)}
                        disabled={isBusy}
                        className="hud-btn px-2 py-0.5 text-xs text-green-400 border-green-500/40 hover:bg-green-500/10 disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => requestAction('reject', itemId, item.title)}
                        disabled={isBusy}
                        className="hud-btn px-2 py-0.5 text-xs text-red-400 border-red-500/40 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
