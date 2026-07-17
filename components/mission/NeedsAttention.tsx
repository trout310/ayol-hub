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
  detail?: string
  recommendation?: string
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

const ACTIONABLE_CATEGORIES = new Set(['tier3_pending', 'owner_ask'])

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function runAction(verb: string, target: string, params?: Record<string, unknown>) {
    setBusyId(`${verb}:${target}`)
    const result = await execute(verb, target, params)
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
    if (verb === 'pause') {
      await runAction(verb, target, { confirmed: true })
    } else {
      await runAction(verb, target)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
            const itemId = item.id
            const isBusy = itemId !== undefined && (busyId?.endsWith(`:${itemId}`) ?? false)
            const showActions = ACTIONABLE_CATEGORIES.has(item.category) && !!itemId
            const isProposal = item.category === 'owner_ask'
            const isExpanded = itemId ? expanded.has(itemId) : false
            const hasDetail = !!(item.detail || item.recommendation)

            return (
              <div
                key={i}
                className={`border-l-2 pl-3 py-1.5 ${borderColor[item.severity] ?? 'border-slate-500'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${severityColor[item.severity] ?? 'text-slate-300'}`}>
                        {item.title}
                      </p>
                      {hasDetail && itemId && (
                        <button
                          onClick={() => toggleExpand(itemId)}
                          className="font-mono text-[10px] text-slate-500 hover:text-slate-300"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-500 mt-0.5">{item.source}</p>
                    {isExpanded && (item.detail || item.recommendation) && (
                      <div className="mt-2 space-y-1">
                        {item.detail && (
                          <p className="font-mono text-xs text-slate-400">{item.detail}</p>
                        )}
                        {item.recommendation && (
                          <p className="font-mono text-xs text-cyan-400/70">
                            ▶ {item.recommendation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {showActions && (
                    <div className="flex gap-1.5 shrink-0">
                      {isProposal ? (
                        <>
                          <button
                            onClick={() => itemId && requestAction('approve', itemId, item.title)}
                            disabled={isBusy}
                            title="Records that you already hand-edited LEARNINGS.md. Does NOT make the edits."
                            className="hud-btn px-2 py-0.5 text-xs text-green-400 border-green-500/40 hover:bg-green-500/10 disabled:opacity-40"
                          >
                            Mark applied
                          </button>
                          <button
                            onClick={() => itemId && requestAction('skip_proposal', itemId, item.title)}
                            disabled={isBusy}
                            title="Defers this proposal. It will be re-proposed from current state on the next run."
                            className="hud-btn px-2 py-0.5 text-xs text-slate-400 border-slate-500/40 hover:bg-slate-500/10 disabled:opacity-40"
                          >
                            Defer
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => requestAction('approve', itemId!, item.title)}
                            disabled={isBusy}
                            className="hud-btn px-2 py-0.5 text-xs text-green-400 border-green-500/40 hover:bg-green-500/10 disabled:opacity-40"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => requestAction('reject', itemId!, item.title)}
                            disabled={isBusy}
                            className="hud-btn px-2 py-0.5 text-xs text-red-400 border-red-500/40 hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </>
                      )}
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
