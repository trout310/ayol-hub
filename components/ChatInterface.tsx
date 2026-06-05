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
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const newSid = await streamChat(projectId, msg, sessionId, (event) => {
        // Extract text from stream-json content_block_delta events
        if (
          event.type === 'content_block_delta' &&
          (event.delta as { type?: string })?.type === 'text_delta'
        ) {
          assistantContent += (event.delta as { text?: string }).text ?? ''
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
            return updated
          })
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
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center font-mono text-sm text-slate-600">
            How can I assist you?
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">
                J
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-tr-sm bg-blue-600 text-white'
                  : 'rounded-tl-sm bg-slate-800 text-slate-100'
              }`}
            >
              {msg.content ||
                (streaming && msg.role === 'assistant' ? (
                  <span className="animate-pulse text-blue-400">▋</span>
                ) : null)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-2 border-t border-slate-700 p-3">
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
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
