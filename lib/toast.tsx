'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  ok: boolean
}

interface ToastContextValue {
  push: (message: string, ok: boolean) => void
}

const ToastContext = createContext<ToastContextValue>({ push: () => {} })

let _counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, ok: boolean) => {
    const id = ++_counter
    setToasts((prev) => [...prev, { id, message, ok }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-2.5 font-mono text-sm shadow-xl border pointer-events-auto fade-up ${
              t.ok
                ? 'bg-slate-900/95 border-green-500/50 text-green-300'
                : 'bg-slate-900/95 border-red-500/50 text-red-300'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
