'use client'
import { useEffect, useState, useCallback } from 'react'

interface Props {
  projectId: string
}

function getCsrf(): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.match(/(?:^|;\s*)hub_csrf=([^;]*)/)?.[1] ?? ''
}

export default function LearnEditor({ projectId }: Props) {
  const [entry, setEntry] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [recentLines, setRecentLines] = useState<string[]>([])
  const [showRecent, setShowRecent] = useState(false)

  const loadRecent = useCallback(() => {
    fetch(`/api/relay/hub/learnings/${encodeURIComponent(projectId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.content) {
          const sections = (d.content as string)
            .split('\n### ')
            .filter(Boolean)
            .slice(-3)
            .reverse()
          setRecentLines(sections.map(s => s.split('\n').slice(0, 3).join('\n').trim()))
        }
      })
      .catch(() => {})
  }, [projectId])

  useEffect(() => { loadRecent() }, [loadRecent])

  async function submit() {
    if (!entry.trim()) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/relay/hub/learnings/${encodeURIComponent(projectId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrf(),
        },
        body: JSON.stringify({ entry }),
      })
      const d = await res.json()
      if (res.ok && d.ok) {
        setStatus({ ok: true, msg: 'Saved' })
        setEntry('')
        loadRecent()
      } else {
        setStatus({ ok: false, msg: d.error ?? `Error ${res.status}` })
      }
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="hud-label text-[10px]">Add Learning</p>
        {recentLines.length > 0 && (
          <button
            onClick={() => setShowRecent(v => !v)}
            className="font-mono text-[10px] text-cyan-400/60 hover:text-cyan-300 transition-colors"
          >
            {showRecent ? 'hide' : 'recent'}
          </button>
        )}
      </div>

      {showRecent && recentLines.length > 0 && (
        <div className="space-y-1 mb-1">
          {recentLines.map((s, i) => (
            <div key={i} className="rounded border border-white/10 p-2">
              <pre className="font-mono text-[9px] text-slate-500 whitespace-pre-wrap break-words leading-relaxed">{s}</pre>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={entry}
        onChange={e => setEntry(e.target.value)}
        placeholder="What did you learn? (plain text or markdown)"
        rows={4}
        className="w-full rounded border border-white/10 bg-slate-950/60 p-2 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none resize-none"
      />

      <div className="flex items-center justify-between">
        {status && (
          <span className={`font-mono text-[10px] ${status.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {status.msg}
          </span>
        )}
        <button
          onClick={submit}
          disabled={saving || !entry.trim()}
          className="ml-auto rounded border border-cyan-500/30 px-3 py-1 font-mono text-[10px] text-cyan-300 hover:border-cyan-400/60 hover:bg-cyan-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
