'use client'
import { useEffect, useRef, useState } from 'react'
import { streamChat } from '@/lib/relay'
import VoiceButton from './VoiceButton'

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
  const [sessionId, setSessionId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(`session:${projectId}`)
    if (stored) setSessionId(stored)
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    const msg = text.trim()
    if (!msg || streaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setStreaming(true)

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
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${errMsg}` }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="glass flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="arc-reactor scale-[0.4] opacity-70" aria-hidden>
              <div className="arc-core" />
            </div>
            <p className="font-mono text-xs tracking-[0.25em] text-cyan-400/60 uppercase">
              How can I assist you?
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
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
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-tr-sm bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]'
                  : 'rounded-tl-sm border border-cyan-400/10 bg-slate-900/70 text-slate-100'
              }`}
            >
              {msg.content ||
                (streaming && msg.role === 'assistant' ? (
                  <span className="animate-pulse text-cyan-400">▋</span>
                ) : null)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-2 border-t border-cyan-400/15 p-3">
        <VoiceButton onTranscript={(text) => setInput(prev => prev + text)} />
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
