'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Opts {
  onResult: (text: string) => void
  onStart?: () => void
}

// Web Speech API wrapper. Returns a listening flag and a start() trigger so any
// control (the logo button, the hero reticle) can begin dictation.
export function useSpeechRecognition({ onResult, onStart }: Opts) {
  const [listening, setListening] = useState(false)
  const resultRef = useRef(onResult)
  const startRef = useRef(onStart)

  // Keep the latest callbacks without re-creating start().
  useEffect(() => {
    resultRef.current = onResult
    startRef.current = onStart
  })

  const start = useCallback(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return

    startRef.current?.() // unlock audio etc. while still in the user gesture

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t = (e.results[0][0].transcript as string).trim()
      if (t) resultRef.current(t)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    setListening(true)
  }, [])

  return { listening, start }
}
