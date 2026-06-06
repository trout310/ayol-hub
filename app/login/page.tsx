'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError('Incorrect username or password')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center">
      {/* Arc reactor */}
      <div className="fade-up relative mb-8 flex items-center justify-center">
        <div className="absolute h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
        <div className="arc-reactor" aria-hidden>
          <div className="arc-core" />
        </div>
        <div className="absolute font-mono text-[0.7rem] tracking-[0.3em] text-cyan-300/80">
          J.A.R.V.I.S.
        </div>
      </div>

      <p className="fade-up mb-2 font-mono text-[0.7rem] tracking-[0.35em] text-cyan-400/80 uppercase">
        Just A Rather Very Intelligent System
      </p>
      <h1 className="fade-up glow-text mb-8 text-4xl font-bold tracking-tight">AYOL HUB</h1>

      <form onSubmit={submit} className="fade-up w-full max-w-xs px-4">
        <label className="hud-label mb-2 block">Authentication required</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoFocus
          autoComplete="username"
          className="hud-input mb-3 w-full rounded-lg px-4 py-3 text-white placeholder-slate-600"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="hud-input w-full rounded-lg px-4 py-3 text-white placeholder-slate-600"
        />
        {error && (
          <p className="mt-3 font-mono text-xs text-red-400">⚠ {error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="hud-btn mt-4 w-full rounded-lg px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
        >
          {loading ? 'Authenticating…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
