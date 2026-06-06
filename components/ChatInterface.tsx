'use client'
import { useEffect, useRef, useState } from 'react'
import { streamChat } from '@/lib/relay'
import VoiceButton from './VoiceButton'
import JarvisLogo from './JarvisLogo'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  projectId: string
}

export default function ChatInterface({ projectId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds since the request started
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`session:${projectId}`)
    if (stored) setSessionId(stored)
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Synthesize the reply in JARVIS's voice and play it (used for voice messages).
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
      audioRef.current?.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play().catch(() => {}) // autoplay may be blocked; fail quietly
    } catch {
      /* TTS is best-effort */
    }
  }

  const sendMessage = async (text: string, opts: { voice?: boolean } = {}) => {
    const msg = text.trim()
    if (!msg || streaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setStreaming(true)

    // Start the "thinking" elapsed-seconds timer.
    const startedAt = Date.now()
    setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 100)

    let assistantContent = ''
    let streamed = false
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const render = () => {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
        return updated
      })
    }

    try {
      const newSid = await streamChat(projectId, msg, sessionId, (event) => {
        // 1. Streaming deltas (with --include-partial-messages) — token-by-token.
        if (
          event.type === 'content_block_delta' &&
          (event.delta as { type?: string })?.type === 'text_delta'
        ) {
          streamed = true
          assistantContent += (event.delta as { text?: string }).text ?? ''
          render()
        }
        // 2. Full assistant message — fallback when no deltas arrived.
        else if (event.type === 'assistant' && !streamed) {
          const content = (event as { message?: { content?: Array<{ type?: string; text?: string }> } })
            .message?.content
          const text = (content ?? [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text ?? '')
            .join('')
          if (text) {
            assistantContent = text
            render()
          }
        }
        // 3. Final result — last-resort fallback if nothing else produced text.
        else if (event.type === 'result' && !streamed && !assistantContent) {
          const result = (event as { result?: string }).result
          if (typeof result === 'string' && result) {
            assistantContent = result
            render()
          }
        }
        // 4. Explicit relay error — show it instead of leaving an empty bubble.
        else if (event.type === 'error') {
          const errText = (event as { error?: string }).error ?? 'Unknown error'
          assistantContent = `⚠️ ${errText}`
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

      // Speak the reply back in JARVIS's voice if this was a voice message.
      if (opts.voice && assistantContent && !assistantContent.startsWith('⚠️')) {
        void speak(assistantContent)
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${errMsg}` }
        return updated
      })
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setStreaming(false)
    }
  }

  return (
    <div className="glass flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <JarvisLogo size={64} className="opacity-70" />
            <p className="font-mono text-xs tracking-[0.25em] text-cyan-400/60 uppercase">
              How can I assist you?
            </p>
          </div>
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-xs font-bold text-slate-950 shadow-[0_0_12px_rgba(34,211,248,0.5)]">
                  J
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
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
      <div className="flex gap-2 border-t border-cyan-400/15 p-3">
        <VoiceButton onResult={(text) => sendMessage(text, { voice: true })} />
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
