'use client'
import { useState, useCallback } from 'react'

interface Props {
  onTranscript: (text: string) => void
}

export default function VoiceButton({ onTranscript }: Props) {
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
      const transcript = e.results[0][0].transcript as string
      onTranscript(transcript + ' ')
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.start()
    setListening(true)
  }, [onTranscript])

  return (
    <button
      type="button"
      onClick={startListening}
      disabled={listening}
      className={`rounded-lg px-3 py-2 text-sm transition-all ${
        listening
          ? 'animate-pulse bg-red-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
      title={listening ? 'Listening…' : 'Voice input'}
    >
      {listening ? '🔴' : '🎤'}
    </button>
  )
}
