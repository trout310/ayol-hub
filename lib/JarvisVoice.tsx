"use client"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// One voice state for the whole site — the hero reticle, the chat's mic button and
// the mute button all read and drive the same thing, the same way the desktop HUD's
// reticle and buttons share ui_bus state.
//
//   listening  — browser dictation (Web Speech API) is capturing an utterance
//   muted      — JARVIS stays silent: spoken replies are skipped, any reply that
//                is playing stops, and dictation is stopped/ignored until unmuted
//
// Mirrors the desktop HUD semantics: click the reticle to listen/stop; mute stops
// listening; asking to listen while muted unmutes first.

interface Handlers {
  onResult: (text: string) => void
}

export interface JarvisVoice {
  listening: boolean
  muted: boolean
  supported: boolean // false when the browser has no SpeechRecognition
  startListen: () => void
  stopListen: () => void
  toggleListen: () => void
  toggleMute: () => void
  speak: (text: string) => Promise<void>
  primeAudio: () => void
  register: (h: Handlers) => void
}

const MUTED_KEY = 'jarvis:muted'

// Tiny silent WAV used to "unlock" audio playback during a user gesture so the
// later TTS reply can play without being blocked by the browser autoplay policy.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

const Ctx = createContext<JarvisVoice | null>(null)

export function JarvisVoiceProvider({ children }: { children: ReactNode }) {
  const [listening, setListening] = useState(false)
  const [muted, setMuted] = useState(false)
  const [supported, setSupported] = useState(true)
  const mutedRef = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const handlersRef = useRef<Handlers | null>(null)

  useEffect(() => {
    try {
      const m = localStorage.getItem(MUTED_KEY) === '1'
      mutedRef.current = m
      setMuted(m)
    } catch {
      /* storage unavailable — stay unmuted */
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    setSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition))
  }, [])

  const register = useCallback((h: Handlers) => {
    handlersRef.current = h
  }, [])

  const primeAudio = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new Audio()
      const a = audioRef.current
      a.src = SILENT_WAV
      a.muted = true
      a.play()
        .then(() => {
          a.pause()
          a.currentTime = 0
          a.muted = false
        })
        .catch(() => {})
    } catch {
      /* ignore */
    }
  }, [])

  const stopAudio = () => {
    const a = audioRef.current
    if (!a) return
    try {
      a.pause()
      if (a.src.startsWith('blob:')) URL.revokeObjectURL(a.src)
      a.removeAttribute('src')
    } catch {
      /* ignore */
    }
  }

  const speak = useCallback(async (text: string) => {
    if (mutedRef.current) return
    const clean = text.replace(/^⚠️\s*/, '').slice(0, 800).trim()
    if (!clean) return
    try {
      const res = await fetch('/api/voice/synth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      })
      if (!res.ok || mutedRef.current) return // muted while synthesising: stay quiet
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = audioRef.current ?? new Audio()
      audioRef.current = a
      // Revoke the previous blob URL before reassigning to avoid leaks.
      if (a.src.startsWith('blob:')) URL.revokeObjectURL(a.src)
      a.muted = false
      a.src = url
      a.onended = () => URL.revokeObjectURL(url)
      await a.play().catch(() => URL.revokeObjectURL(url))
    } catch {
      /* TTS is best-effort */
    }
  }, [])

  const stopListen = useCallback(() => {
    const rec = recRef.current
    recRef.current = null
    if (rec) {
      try {
        rec.abort() // onend fires and clears the flag; clear eagerly too
      } catch {
        /* ignore */
      }
    }
    setListening(false)
  }, [])

  const startListen = useCallback(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }
    if (mutedRef.current) {
      // HUD parity: asking to listen while muted unmutes first.
      mutedRef.current = false
      setMuted(false)
      try {
        localStorage.setItem(MUTED_KEY, '0')
      } catch {
        /* ignore */
      }
    }
    if (recRef.current) return // already listening
    primeAudio() // unlock audio while still inside the user gesture

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = (e.results[0][0].transcript as string).trim()
      // A stop/mute that raced the result wins — drop the utterance.
      if (t && recRef.current === rec && !mutedRef.current) handlersRef.current?.onResult(t)
    }
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null
      setListening(false)
    }
    rec.onerror = rec.onend
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [primeAudio])

  const toggleListen = useCallback(() => {
    if (recRef.current) stopListen()
    else startListen()
  }, [startListen, stopListen])

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    try {
      localStorage.setItem(MUTED_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (next) {
      stopListen()
      stopAudio()
    }
  }, [stopListen])

  const value = useMemo<JarvisVoice>(
    () => ({
      listening,
      muted,
      supported,
      startListen,
      stopListen,
      toggleListen,
      toggleMute,
      speak,
      primeAudio,
      register,
    }),
    [listening, muted, supported, startListen, stopListen, toggleListen, toggleMute, speak, primeAudio, register],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useJarvisVoice(): JarvisVoice {
  const v = useContext(Ctx)
  if (!v) throw new Error('useJarvisVoice must be used inside <JarvisVoiceProvider>')
  return v
}
