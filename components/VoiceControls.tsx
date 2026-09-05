"use client"
import { useJarvisVoice } from '@/lib/JarvisVoice'

// The two buttons under the reticle — same pair as the desktop HUD.
export default function VoiceControls({ className = '' }: { className?: string }) {
  const { listening, muted, supported, toggleListen, toggleMute } = useJarvisVoice()
  const base =
    'font-mono text-[0.6rem] tracking-[0.2em] uppercase rounded-md border px-3 py-1 transition-colors ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60'
  return (
    <div className={`flex items-center gap-2 ${className}`} role="group" aria-label="JARVIS voice controls">
      <button
        type="button"
        onClick={toggleMute}
        aria-pressed={muted}
        title={muted ? 'Unmute JARVIS' : 'Mute JARVIS'}
        className={`${base} ${
          muted
            ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
            : 'border-cyan-400/20 bg-slate-900/70 text-cyan-300/70 hover:border-cyan-400/50 hover:text-cyan-200'
        }`}
      >
        {muted ? 'unmute' : 'mute'}
      </button>
      <button
        type="button"
        onClick={toggleListen}
        disabled={!supported}
        aria-pressed={listening}
        title={
          !supported
            ? 'This browser has no speech recognition'
            : listening
              ? 'Stop listening'
              : 'Listen'
        }
        className={`${base} ${
          listening
            ? 'border-red-500/60 bg-red-600/20 text-red-200 shadow-[0_0_16px_-4px_rgba(239,68,68,0.85)]'
            : 'border-cyan-400/20 bg-slate-900/70 text-cyan-300/70 hover:border-cyan-400/50 hover:text-cyan-200'
        } disabled:opacity-40`}
      >
        {listening ? 'stop' : 'listen'}
      </button>
    </div>
  )
}
