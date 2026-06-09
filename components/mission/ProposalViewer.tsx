'use client'
import { useEffect, useState } from 'react'
import { useAction } from '@/lib/useAction'
import { useToast } from '@/lib/toast'

interface ProposalMeta {
  name: string
  filename: string
  preview: string
  size: number
  modified: string
}

interface ProposalDetail extends ProposalMeta {
  content: string
}

interface Props {
  refreshTick?: number
  onActionDone?: () => void
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' }) }
  catch { return iso }
}

export default function ProposalViewer({ refreshTick = 0, onActionDone }: Props) {
  const [proposals, setProposals] = useState<ProposalMeta[]>([])
  const [selected, setSelected] = useState<ProposalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { execute, loading: acting } = useAction()
  const { push: toast } = useToast()

  useEffect(() => {
    setLoading(true)
    fetch('/api/relay/hub/proposals')
      .then(r => r.json())
      .then(d => { setProposals(d.proposals ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [refreshTick])

  async function openProposal(name: string) {
    if (selected?.name === name) { setSelected(null); return }
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/relay/hub/proposals/${encodeURIComponent(name)}`)
      const d = await res.json()
      setSelected(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleAction(verb: 'approve' | 'reject' | 'skip_proposal', name: string) {
    const result = await execute(verb, name)
    toast(result.ok ? `${verb}: ${name}` : `Failed: ${result.result}`, result.ok)
    if (result.ok) {
      setSelected(null)
      setProposals(ps => ps.filter(p => p.name !== name))
      onActionDone?.()
    }
  }

  if (loading) return <div className="glass rounded-xl p-4"><p className="hud-label text-slate-500">Loading…</p></div>
  if (proposals.length === 0 && !error) return null

  return (
    <div className="glass rounded-xl p-4">
      <p className="hud-label mb-3">Pending Proposals</p>
      {error && <p className="hud-label text-red-400/70 mb-2">{error}</p>}

      <div className="space-y-2">
        {proposals.map(p => (
          <div key={p.name}>
            <button
              onClick={() => openProposal(p.name)}
              className="w-full text-left rounded-lg border border-white/10 px-3 py-2 hover:border-cyan-500/30 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-cyan-300">{p.filename}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-slate-500">{formatDate(p.modified)}</span>
                  <span className="font-mono text-[10px] text-slate-600">
                    {selected?.name === p.name ? '▲' : '▼'}
                  </span>
                </div>
              </div>
              {selected?.name !== p.name && (
                <p className="mt-1 font-mono text-[10px] text-slate-500 truncate">{p.preview.split('\n')[0]}</p>
              )}
            </button>

            {selected?.name === p.name && (
              <div className="mt-1 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                {detailLoading ? (
                  <p className="hud-label text-slate-500">Loading…</p>
                ) : (
                  <>
                    <pre className="font-mono text-[10px] text-slate-300 whitespace-pre-wrap break-words max-h-72 overflow-y-auto mb-3">
                      {selected.content}
                    </pre>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('approve', p.name)}
                        disabled={acting}
                        className="flex-1 rounded px-2 py-1 font-mono text-[10px] bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction('skip_proposal', p.name)}
                        disabled={acting}
                        className="flex-1 rounded px-2 py-1 font-mono text-[10px] bg-slate-800/40 border border-white/10 text-slate-400 hover:bg-slate-800/60 disabled:opacity-40 transition-colors"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleAction('reject', p.name)}
                        disabled={acting}
                        className="flex-1 rounded px-2 py-1 font-mono text-[10px] bg-red-900/40 border border-red-500/30 text-red-300 hover:bg-red-900/60 disabled:opacity-40 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
