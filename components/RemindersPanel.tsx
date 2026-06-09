'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface ReminderItem {
  id: string
  title: string
}

function getCsrf(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)hub_csrf=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function fetchItems(projectId: string): Promise<ReminderItem[]> {
  const res = await fetch(`/api/relay/reminders/${projectId}`)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.items) ? data.items : []
}

async function sendAction(
  projectId: string,
  action: 'add' | 'complete' | 'delete',
  title: string
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`/api/relay/reminders/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
    body: JSON.stringify({ action, title }),
  })
  const data = await res.json()
  return { ok: res.ok && data.ok, message: data.message ?? data.error ?? '' }
}

export default function RemindersPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ReminderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    const data = await fetchItems(projectId)
    setItems(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const t = newTitle.trim()
    if (!t || busy) return
    setBusy('add')
    const { ok } = await sendAction(projectId, 'add', t)
    if (ok) { setNewTitle(''); await load() }
    setBusy(null)
  }

  async function handleComplete(title: string) {
    if (busy) return
    setBusy(`complete:${title}`)
    const { ok } = await sendAction(projectId, 'complete', title)
    if (ok) await load()
    setBusy(null)
  }

  async function handleDelete(title: string) {
    if (busy) return
    setBusy(`delete:${title}`)
    const { ok } = await sendAction(projectId, 'delete', title)
    if (ok) await load()
    setBusy(null)
  }

  if (loading) {
    return (
      <div className="glass hud-corners p-4">
        <span className="hud-label">Reminders</span>
        <p className="mt-2 font-mono text-xs text-slate-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="glass hud-corners p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="hud-label">Reminders</span>
        <span className="font-mono text-[10px] text-slate-600">{items.length} open</span>
      </div>

      {items.length === 0 ? (
        <p className="font-mono text-xs text-slate-600 mb-3">No open items</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => handleComplete(item.title)}
                disabled={!!busy}
                title="Mark complete"
                className="shrink-0 h-4 w-4 rounded-full border border-slate-600 hover:border-cyan-400 hover:bg-cyan-400/10 transition-colors disabled:opacity-40"
              />
              <span className="flex-1 font-mono text-xs text-slate-300 truncate">{item.title}</span>
              <button
                onClick={() => handleDelete(item.title)}
                disabled={!!busy}
                title="Delete"
                className="shrink-0 opacity-0 group-hover:opacity-100 font-mono text-[10px] text-slate-600 hover:text-red-400 transition-all disabled:opacity-20"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add reminder…"
          className="flex-1 bg-transparent border border-slate-700 rounded px-2 py-1 font-mono text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || !!busy}
          className="font-mono text-xs text-cyan-400 hover:text-cyan-200 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors px-2"
        >
          {busy === 'add' ? '…' : '+'}
        </button>
      </form>
    </div>
  )
}
