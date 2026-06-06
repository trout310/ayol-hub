'use client'
import { useState, useCallback } from 'react'

interface Props {
  // Called with the final transcript; the chat sends it as a voice message
  // (and replies in JARVIS's voice).
  onResult: (text: string) => void
}

export default function VoiceButton({ onResult }: Props) {
  const [listening, setListening] = useState(false)

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = (e.results[0][0].transcript as string).trim()
      if (transcript) onResult(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.start()
    setListening(true)
  }, [onResult])

  return (
    <button
      type="button"
      onClick={startListening}
      disabled={listening}
      className={`rounded-lg border px-3 py-2 text-sm transition-all ${
        listening
          ? 'animate-pulse border-red-500/50 bg-red-600/80 text-white shadow-[0_0_16px_-4px_rgba(239,68,68,0.8)]'
          : 'border-cyan-400/20 bg-slate-900/70 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200'
      }`}
      title={listening ? 'Listening…' : 'Voice input'}
    >
      {listening ? '🔴' : '🎤'}
    </button>
  )
}
