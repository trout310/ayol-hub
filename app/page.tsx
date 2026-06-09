'use client'
import { useEffect, useState, useCallback } from 'react'
import JarvisLogo from '@/components/JarvisLogo'
import ChatInterface from '@/components/ChatInterface'
import NeedsAttention from '@/components/mission/NeedsAttention'

interface AttentionItem {
  severity: string
  category: string
  title: string
  source: string
}

export default function HomePage() {
  const [items, setItems] = useState<AttentionItem[]>([])
  const [attentionLoaded, setAttentionLoaded] = useState(false)
  const [attentionError, setAttentionError] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchMission = useCallback(async () => {
    try {
      const res = await fetch('/api/relay/mission', { cache: 'no-store' })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setItems(data?.needs_attention?.items ?? [])
      setLastFetched(new Date())
      setAttentionError(false)
    } catch {
      setAttentionError(true)
    } finally {
      setAttentionLoaded(true)
    }
  }, [])

  useEffect(() => {
    fetchMission()
    const interval = setInterval(fetchMission, 45_000)
    return () => clearInterval(interval)
  }, [fetchMission])

  const lastTimeStr = lastFetched
    ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  return (
    <div className="flex flex-col items-center gap-10">
      {/* Hero */}
      <div className="fade-up relative flex items-center justify-center mt-4">
        <div className="absolute h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
        <JarvisLogo size={140} />
        <div className="absolute flex flex-col items-center">
          <p className="hud-label mb-1">Online</p>
          <span className="font-mono text-[0.65rem] tracking-[0.3em] text-cyan-300/80">
            J.A.R.V.I.S.
          </span>
        </div>
      </div>

      {/* Chat */}
      <div className="w-full max-w-2xl">
        <ChatInterface projectId="jarvis" />
      </div>

      {/* Needs Attention */}
      <div className="w-full max-w-2xl">
        {!attentionLoaded ? (
          <div className="glass hud-corners p-5 flex items-center justify-center">
            <span className="hud-label">Loading…</span>
          </div>
        ) : attentionError ? (
          <div className="glass hud-corners p-5 flex items-center justify-center">
            <span className="hud-label text-red-400/80">
              Relay unreachable — last data from {lastTimeStr}
            </span>
          </div>
        ) : (
          <NeedsAttention items={items} />
        )}
      </div>
    </div>
  )
}
