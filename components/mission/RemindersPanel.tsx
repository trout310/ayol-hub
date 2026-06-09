'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

interface ReminderItem {
  id: string
  title: string
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)hub_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function callAction(verb: string, target: string, title: string): Promise<string> {
  const csrf = getCsrfToken()
  const res = await fetch('/api/relay/mission/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ verb, target, params: { title } }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data.result || ''
}

interface Props {
  projectId: string
}

export default function RemindersPanel({ projectId }: Props) {
  const [items, setItems] = useState<ReminderItem[]>([])
  const [listName, setListName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addText, setAddText] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/relay/${projectId}/reminders`, { cache: 'no-store' })
      if (res.status === 404) {
        setError(null)
        setItems([])
        setListName('')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setListName(data.list ?? '')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchItems()
    const interval = setInterval(fetchItems, 30_000)
    return () => clearInterval(interval)
  }, [fetchItems])

  async function handleComplete(item: ReminderItem) {
    setBusy(prev => new Set(prev).add(item.id))
    try {
      await callAction('complete_reminder', projectId, item.title)
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(item.id); return s })
    }
  }

  async function handleDelete(item: ReminderItem) {
    setBusy(prev => new Set(prev).add(item.id + '-del'))
    try {
      await callAction('delete_reminder', projectId, item.title)
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(item.id + '-del'); return s })
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = addText.trim()
    if (!title) return
    setAdding(true)
    try {
      await callAction('add_reminder', projectId, title)
      setAddText('')
      await fetchItems()
      inputRef.current?.focus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  if (!loading && !listName && !error) return null

  return (
    <div className="glass hud-corners p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="hud-label">
          {listName ? `Reminders — ${listName}` : 'Reminders'}
        </span>
        {items.length > 0 && (
          <span className="font-mono text-xs text-slate-500">{items.length} open</span>
        )}
      </div>

      {loading && (
        <p className="font-mono text-xs text-slate-500">Loading…</p>
      )}

      {error && (
        <p className="font-mono text-xs text-red-400/80">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="font-mono text-xs text-slate-600 mb-3">No open items</p>
      )}

      {items.length > 0 && (
        <ul className="mb-4 space-y-1">
          {items.map(item => (
            <li
              key={item.id}
              className="flex items-start gap-2 group"
            >
              <button
                onClick={() => handleComplete(item)}
                disabled={busy.has(item.id)}
                className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-slate-600 hover:border-cyan-400 transition-colors disabled:opacity-40"
                title="Mark complete"
              />
              <span className="flex-1 font-mono text-xs text-slate-300 leading-relaxed">
                {item.title}
              </span>
              <button
                onClick={() => handleDelete(item)}
                disabled={busy.has(item.id + '-del')}
                className="opacity-0 group-hover:opacity-100 font-mono text-xs text-slate-600 hover:text-red-400 transition-all disabled:opacity-40 flex-shrink-0"
                title="Delete"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={addText}
          onChange={e => setAddText(e.target.value)}
          placeholder="Add a reminder…"
          disabled={adding}
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={adding || !addText.trim()}
          className="font-mono text-xs text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded px-3 py-1 transition-colors disabled:opacity-30"
        >
          {adding ? '…' : 'Add'}
        </button>
      </form>
    </div>
  )
}
