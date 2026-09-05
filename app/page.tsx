'use client'
import { useEffect, useState, useCallback } from 'react'
import JarvisLogo from '@/components/JarvisLogo'
import ChatInterface from '@/components/ChatInterface'
import NeedsAttention from '@/components/mission/NeedsAttention'
import VoiceControls from '@/components/VoiceControls'
import { useJarvisVoice } from '@/lib/JarvisVoice'

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
  const { listening, muted, toggleListen } = useJarvisVoice()

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
      {/* Hero — the reticle is the listen/stop switch, like the desktop HUD */}
      <div className="fade-up flex flex-col items-center gap-4 mt-4">
        <button
          type="button"
          onClick={toggleListen}
          aria-pressed={listening}
          title={listening ? 'Stop listening' : 'Listen'}
          className={`relative flex items-center justify-center rounded-full transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
            muted ? 'opacity-50' : ''
          }`}
        >
          <div
            className={`pointer-events-none absolute h-56 w-56 rounded-full blur-3xl ${
              listening ? 'bg-red-500/15' : 'bg-cyan-500/10'
            }`}
            aria-hidden
          />
          <JarvisLogo size={140} spinning={listening} />
          <div className="absolute flex flex-col items-center pointer-events-none">
            <p className={`hud-label mb-1 ${listening ? 'text-red-300' : muted ? 'text-amber-300/90' : ''}`}>
              {listening ? 'Listening…' : muted ? 'Muted' : 'Online'}
            </p>
            <span className="font-mono text-[0.65rem] tracking-[0.3em] text-cyan-300/80">
              J.A.R.V.I.S.
            </span>
          </div>
        </button>
        <VoiceControls />
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
              {lastFetched
                ? `Relay unreachable — last data from ${lastTimeStr}`
                : 'Relay unreachable — could not load'}
            </span>
          </div>
        ) : (
          <NeedsAttention items={items} />
        )}
      </div>
    </div>
  )
}
