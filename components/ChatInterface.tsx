'use client'
import { useEffect, useRef, useState } from 'react'
import { streamChat } from '@/lib/relay'
import { useSpeechRecognition } from '@/lib/useSpeechRecognition'
import JarvisLogo from './JarvisLogo'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  projectId: string
}

// Tiny silent WAV used to "unlock" audio playback during a user gesture so the
// later TTS reply can play without being blocked by the browser autoplay policy.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

export default function ChatInterface({ projectId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds since the request started
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const messagesRef = useRef<Message[]>([]) // mirror for synchronous reads

  // Load persisted history + session for this project on mount / project change.
  useEffect(() => {
    let history: Message[] = []
    try {
      const raw = localStorage.getItem(`chat:${projectId}`)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          history = parsed.filter(
            (m): m is Message =>
              typeof m === 'object' &&
              m !== null &&
              ((m as Message).role === 'user' || (m as Message).role === 'assistant') &&
              typeof (m as Message).content === 'string'
          )
        }
      }
    } catch {
      history = []
    }
    if (
      history.length &&
      history[history.length - 1].role === 'assistant' &&
      !history[history.length - 1].content
    ) {
      history = history.slice(0, -1)
    }
    messagesRef.current = history
    setMessages(history)
    setSessionId(localStorage.getItem(`session:${projectId}`) || null)
  }, [projectId])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const persist = (msgs: Message[]) => {
    try {
      localStorage.setItem(`chat:${projectId}`, JSON.stringify(msgs.slice(-100)))
    } catch {
      /* storage unavailable — non-fatal */
    }
  }

  // Unlock audio during a user gesture so the later TTS reply isn't autoplay-blocked.
  const primeAudio = () => {
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
  }

  const speak = async (text: string) => {
    const clean = text.replace(/^⚠️\s*/, '').slice(0, 800).trim()
    if (!clean) return
    try {
      const res = await fetch('/api/voice/synth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      })
      if (!res.ok) return
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
  }

  const sendMessage = async (text: string, opts: { voice?: boolean } = {}) => {
    const msg = text.trim()
    if (!msg || streaming) return

    setInput('')
    let working: Message[] = [
      ...messagesRef.current,
      { role: 'user', content: msg },
      { role: 'assistant', content: '' },
    ]
    messagesRef.current = working
    setMessages(working)
    persist(working)
    setStreaming(true)

    const startedAt = Date.now()
    setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100)

    let assistantContent = ''
    let streamed = false

    const render = () => {
      working = [...working.slice(0, -1), { role: 'assistant', content: assistantContent }]
      messagesRef.current = working
      setMessages(working)
    }

    try {
      const newSid = await streamChat(projectId, msg, sessionId, (event) => {
        if (
          event.type === 'content_block_delta' &&
          (event.delta as { type?: string })?.type === 'text_delta'
        ) {
          streamed = true
          assistantContent += (event.delta as { text?: string }).text ?? ''
          render()
        } else if (event.type === 'assistant' && !streamed) {
          const content = (event as { message?: { content?: Array<{ type?: string; text?: string }> } })
            .message?.content
          const t = (content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
          if (t) {
            assistantContent = t
            render()
          }
        } else if (event.type === 'result' && !streamed && !assistantContent) {
          const result = (event as { result?: string }).result
          if (typeof result === 'string' && result) {
            assistantContent = result
            render()
          }
        } else if (event.type === 'error') {
          assistantContent = `⚠️ ${(event as { error?: string }).error ?? 'Unknown error'}`
          render()
        }
        if (event.session_id) {
          const sid = event.session_id as string
          setSessionId(sid)
          localStorage.setItem(`session:${projectId}`, sid)
        }
      })

      if (newSid) {
        setSessionId(newSid)
        localStorage.setItem(`session:${projectId}`, newSid)
      }

      if (opts.voice && assistantContent && !assistantContent.startsWith('⚠️')) {
        void speak(assistantContent)
      }
    } catch (e) {
      assistantContent = `⚠️ ${e instanceof Error ? e.message : 'Unknown error'}`
      render()
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      persist(messagesRef.current)
      setStreaming(false)
    }
  }

  const clearChat = () => {
    messagesRef.current = []
    setMessages([])
    try {
      localStorage.removeItem(`chat:${projectId}`)
    } catch {
      /* storage unavailable — non-fatal */
    }
  }

  const { listening, start: startVoice } = useSpeechRecognition({
    onResult: (text) => sendMessage(text, { voice: true }),
    onStart: primeAudio,
  })

  return (
    <div className="glass flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <button
            type="button"
            onClick={startVoice}
            className="group mx-auto mt-10 flex flex-col items-center gap-3 text-center transition-opacity"
            title="Tap to speak"
          >
            <JarvisLogo
              size={72}
              spinning={listening}
              className="opacity-70 transition-opacity group-hover:opacity-100"
            />
            <p className="font-mono text-xs tracking-[0.25em] text-cyan-400/60 uppercase group-hover:text-cyan-300/80">
              {listening ? 'Listening…' : 'How can I assist you?'}
            </p>
            {!listening && (
              <span className="font-mono text-[0.6rem] tracking-[0.2em] text-slate-600 uppercase">
                tap to speak · or type below
              </span>
            )}
          </button>
        )}
        {messages.map((msg, i) => {
          const isLastAssistant = i === messages.length - 1 && msg.role === 'assistant'
          const thinking = isLastAssistant && streaming && msg.content === ''
          return (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-xs font-bold text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.5)]">
                  J
                </div>
              )}
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]'
                    : 'rounded-tl-sm border border-cyan-400/10 bg-slate-900/70 text-slate-100'
                }`}
              >
                {thinking ? (
                  <span className="flex items-center gap-2 text-cyan-300/80">
                    <JarvisLogo size={18} spinning />
                    <span className="font-mono text-xs">Thinking… {elapsed.toFixed(1)}s</span>
                  </span>
                ) : (
                  msg.content ||
                  (streaming && msg.role === 'assistant' ? (
                    <span className="animate-pulse text-cyan-400">▋</span>
                  ) : null)
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-cyan-400/15 p-3">
        <button
          type="button"
          onClick={startVoice}
          title={listening ? 'Listening…' : 'Speak to JARVIS'}
          className={`flex items-center justify-center rounded-lg border p-2 transition-all ${
            listening
              ? 'border-red-500/60 bg-red-600/20 shadow-[0_0_16px_-4px_rgba(239,68,68,0.85)]'
              : 'border-cyan-400/20 bg-slate-900/70 hover:border-cyan-400/50'
          }`}
        >
          <JarvisLogo size={22} spinning={listening} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(input)
            }
          }}
          placeholder="Message JARVIS…"
          className="hud-input flex-1 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-600"
        />
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            disabled={streaming}
            title="Clear chat history"
            className="font-mono text-[0.6rem] tracking-[0.15em] text-slate-600 uppercase transition-colors hover:text-cyan-400 disabled:opacity-40"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={streaming || !input.trim()}
          className="hud-btn rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
