'use client'
import { useEffect, useState } from 'react'
import { useAction } from '@/lib/useAction'
import { useToast } from '@/lib/toast'

// `summary` is parsed relay-side from the proposal markdown (hub_content.
// _plain_english). An EMPTY summary means the proposal predates the
// plain-English format — deliberately distinguishable from a summary that says
// nothing, so the card can say "no summary written" instead of showing blanks.
interface ProposalSummary {
  now?: string
  proposed?: string
  benefit?: string
  risk?: string
  'needs your judgment'?: string
  'skip-safe'?: string
}

interface ProposalMeta {
  name: string
  filename: string
  preview: string
  summary?: ProposalSummary
  has_summary?: boolean
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

  // Wording matches what the verb ACTUALLY does. Approve records a decision and
  // queues it — it does not apply anything, which is Aaron's explicit choice
  // (2026-08-28) and retires the button that "approved" 20 proposals while
  // applying nothing for a month.
  const VERB_SAID: Record<string, string> = {
    approve: 'Approved — queued for Jarvis to do',
    skip_proposal: 'Left alone — it will come back next run',
    reject: 'Denied',
  }

  async function handleAction(verb: 'approve' | 'reject' | 'skip_proposal', name: string) {
    const result = await execute(verb, name)
    toast(result.ok ? VERB_SAID[verb] : `Failed: ${result.result}`, result.ok)
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
                <p className="mt-1 text-[11px] leading-snug text-slate-400 line-clamp-2">
                  {p.summary?.proposed ?? p.preview.split('\n')[0]}
                </p>
              )}
            </button>

            {selected?.name === p.name && (
              <div className="mt-1 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                {detailLoading ? (
                  <p className="hud-label text-slate-500">Loading…</p>
                ) : (
                  <>
                    {p.has_summary === false && (
                      <p className="mb-3 rounded border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-300">
                        No plain-English summary in this proposal — it predates the
                        format. Regenerate it to get one.
                      </p>
                    )}

                    {p.summary && (
                      <div className="mb-3 space-y-3">
                        {/* The difference, which is the thing he actually decides on */}
                        {(p.summary.now || p.summary.proposed) && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded border border-white/10 bg-slate-900/50 p-2">
                              <p className="hud-label mb-1 text-slate-500">Now</p>
                              <p className="text-[11px] leading-snug text-slate-300">{p.summary.now ?? '—'}</p>
                            </div>
                            <div className="rounded border border-cyan-500/25 bg-cyan-950/20 p-2">
                              <p className="hud-label mb-1 text-cyan-400/80">If you approve</p>
                              <p className="text-[11px] leading-snug text-slate-200">{p.summary.proposed ?? '—'}</p>
                            </div>
                          </div>
                        )}

                        {/* Pros and cons, side by side. A proposal with only
                            upside cannot be weighed, so an absent Risks line is
                            called out rather than left blank. */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded border border-emerald-500/20 bg-emerald-950/15 p-2">
                            <p className="hud-label mb-1 text-emerald-400/80">Good for you</p>
                            <p className="text-[11px] leading-snug text-slate-300">{p.summary.benefit ?? '—'}</p>
                          </div>
                          <div className="rounded border border-amber-500/20 bg-amber-950/15 p-2">
                            <p className="hud-label mb-1 text-amber-400/80">What could go wrong</p>
                            <p className="text-[11px] leading-snug text-slate-300">
                              {p.summary.risk ?? 'Not stated — this proposal was written before downsides were required.'}
                            </p>
                          </div>
                        </div>

                        {p.summary['needs your judgment'] && (
                          <div className="rounded border border-white/10 p-2">
                            <p className="hud-label mb-1 text-slate-500">Needs your call</p>
                            <p className="text-[11px] leading-snug text-slate-300">{p.summary['needs your judgment']}</p>
                          </div>
                        )}

                        {p.summary['skip-safe'] && (
                          <p className="text-[10px] italic leading-snug text-slate-500">
                            If you ignore it: {p.summary['skip-safe']}
                          </p>
                        )}
                      </div>
                    )}

                    <details className="mb-3">
                      <summary className="cursor-pointer font-mono text-[10px] text-slate-500 hover:text-slate-300">
                        Show the full proposal
                      </summary>
                      <pre className="mt-2 font-mono text-[10px] text-slate-300 whitespace-pre-wrap break-words max-h-72 overflow-y-auto">
                        {selected.content}
                      </pre>
                    </details>
                    {/* Two buttons, per Aaron 2026-08-28: "a button to approve
                        it and a button to either leave it alone or deny it".
                        Leave-it DEFERS (comes back next run, nothing lost) —
                        the safe, reversible second option. Deny removes it, so
                        it is a demoted link rather than a peer button: it is a
                        real capability but not one to hit by accident. */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('approve', p.name)}
                        disabled={acting}
                        className="flex-1 rounded px-2 py-1.5 text-[11px] font-medium bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction('skip_proposal', p.name)}
                        disabled={acting}
                        className="flex-1 rounded px-2 py-1.5 text-[11px] font-medium bg-slate-800/40 border border-white/10 text-slate-300 hover:bg-slate-800/60 disabled:opacity-40 transition-colors"
                      >
                        Leave it
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[10px] text-slate-500">
                        Approving records your decision — Jarvis does the work later.
                      </p>
                      <button
                        onClick={() => { if (confirm(`Deny "${p.name}" permanently? "Leave it" keeps it coming back.`)) handleAction('reject', p.name) }}
                        disabled={acting}
                        className="text-[10px] text-slate-600 underline underline-offset-2 hover:text-red-400/80 disabled:opacity-40 transition-colors"
                      >
                        deny permanently
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
