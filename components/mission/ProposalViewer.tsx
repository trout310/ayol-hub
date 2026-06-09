'use client'
import { useEffect, useState } from 'react'

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

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' }) }
  catch { return iso }
}

export default function ProposalViewer() {
  const [proposals, setProposals] = useState<ProposalMeta[]>([])
  const [selected, setSelected] = useState<ProposalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/relay/hub/proposals')
      .then(r => r.json())
      .then(d => { setProposals(d.proposals ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

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
              <div className="mt-1 rounded-lg border border-white/10 bg-slate-950/60 p-3 max-h-96 overflow-y-auto">
                {detailLoading ? (
                  <p className="hud-label text-slate-500">Loading…</p>
                ) : (
                  <pre className="font-mono text-[10px] text-slate-300 whitespace-pre-wrap break-words">
                    {selected.content}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
