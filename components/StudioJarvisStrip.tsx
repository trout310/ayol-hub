'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Remote control for the PRODUCTION voice Jarvis on the Studio (SPEC-web-
// remote-control.md T4). Deliberately a separate strip from the browser's own
// mic controls (Q1): the reticle above drives THIS browser; this drives the
// Studio's microphone in the house. Polls state every 2 s while the tab is
// visible; the buttons show the Studio's reported truth, not our last tap.

interface StudioState {
  online: boolean
  muted: boolean | null
  listening: boolean | null
  pending: { action: string; seq: number } | null
  last_seen_age_s: number | null
}

type Action = 'mute' | 'unmute' | 'listen' | 'stop'

const POLL_MS = 2_000

function getCsrf(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)hub_csrf=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function newIdem(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export default function StudioJarvisStrip({ className = '' }: { className?: string }) {
  const [state, setState] = useState<StudioState | null>(null)
  const [reachable, setReachable] = useState(true)
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/jarvis/state', { cache: 'no-store' })
      if (!res.ok) throw new Error(`${res.status}`)
      setState((await res.json()) as StudioState)
      setReachable(true)
    } catch {
      setReachable(false)
    }
  }, [])

  // Visible-only polling: a background tab must not hammer the relay.
  useEffect(() => {
    let stopped = false
    const tick = async () => {
      if (stopped) return
      if (document.visibilityState === 'visible') await poll()
      timer.current = setTimeout(tick, POLL_MS)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    tick()
    return () => {
      stopped = true
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [poll])

  const send = useCallback(
    async (action: Action) => {
      setBusy(action)
      setError(null)
      try {
        const res = await fetch('/api/jarvis/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
          body: JSON.stringify({ action, idem: newIdem() }),
          signal: AbortSignal.timeout(10_000),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError((data as { error?: string; detail?: string }).error ?? (data as { detail?: string }).detail ?? `HTTP ${res.status}`)
        }
      } catch {
        setError('Studio unreachable')
      } finally {
        // Keep the button held until the Studio reports the new state (or 3 s).
        setTimeout(() => setBusy(null), 3_000)
        poll()
      }
    },
    [poll]
  )

  // Clear "busy" as soon as the reported state reflects the tap.
  useEffect(() => {
    if (!busy || !state) return
    if ((busy === 'mute' && state.muted) || (busy === 'unmute' && state.muted === false) ||
        (busy === 'listen' && state.listening) || (busy === 'stop' && state.listening === false)) {
      if (!state.pending) setBusy(null)
    }
  }, [busy, state])

  const online = reachable && !!state?.online
  const muted = !!state?.muted
  const listening = !!state?.listening
  const pending = state?.pending ?? null

  const base =
    'font-mono text-[0.6rem] tracking-[0.2em] uppercase rounded-md border px-3 py-1 transition-colors ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-40'
  const idle = 'border-cyan-400/20 bg-slate-900/70 text-cyan-300/70 hover:border-cyan-400/50 hover:text-cyan-200'

  const status = !reachable
    ? 'relay unreachable'
    : !state?.online
      ? 'Studio offline'
      : pending
        ? `sending ${pending.action}…`
        : listening
          ? 'Listening…'
          : muted
            ? 'Muted'
            : 'Online'

  return (
    <div
      className={`glass hud-corners px-4 py-2 flex flex-wrap items-center justify-center gap-3 ${className}`}
      role="group"
      aria-label="Studio JARVIS microphone controls"
    >
      <span className="hud-label">Studio mic</span>
      <span
        className={`font-mono text-[0.6rem] tracking-[0.15em] ${
          !online ? 'text-slate-500' : listening ? 'text-red-300' : muted ? 'text-amber-300/90' : 'text-cyan-300/80'
        }`}
        aria-live="polite"
      >
        {status}
      </span>
      <button
        type="button"
        onClick={() => send(muted ? 'unmute' : 'mute')}
        disabled={!online || busy !== null}
        aria-pressed={muted}
        title={muted ? 'Unmute the Studio' : 'Mute the Studio'}
        className={`${base} ${muted ? 'border-amber-400/60 bg-amber-500/15 text-amber-200' : idle}`}
      >
        {busy === 'mute' || busy === 'unmute' ? '…' : muted ? 'unmute' : 'mute'}
      </button>
      <button
        type="button"
        onClick={() => send(listening ? 'stop' : 'listen')}
        disabled={!online || busy !== null}
        aria-pressed={listening}
        title={listening ? 'Stop the Studio listening' : 'Make the Studio listen now'}
        className={`${base} ${
          listening
            ? 'border-red-500/60 bg-red-600/20 text-red-200 shadow-[0_0_16px_-4px_rgba(239,68,68,0.85)]'
            : idle
        }`}
      >
        {busy === 'listen' || busy === 'stop' ? '…' : listening ? 'stop' : 'listen'}
      </button>
      {error && (
        <span className="font-mono text-[0.6rem] tracking-[0.1em] text-red-400/80">{error}</span>
      )}
    </div>
  )
}
