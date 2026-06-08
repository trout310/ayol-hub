import Link from 'next/link'
import JarvisLogo from '@/components/JarvisLogo'

export default function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      {/* JARVIS HUD reticle behind the title */}
      <div className="fade-up relative mb-10 flex items-center justify-center">
        <div className="absolute h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
        <JarvisLogo size={180} />
        <div className="absolute flex flex-col items-center">
          <p className="hud-label mb-1">Online</p>
          <span className="font-mono text-[0.65rem] tracking-[0.3em] text-cyan-300/80">
            J.A.R.V.I.S.
          </span>
        </div>
      </div>

      <p className="fade-up mb-3 font-mono text-[0.7rem] tracking-[0.35em] text-cyan-400/80 uppercase">
        Just A Rather Very Intelligent System
      </p>
      <h1 className="fade-up glow-text mb-3 text-6xl font-bold tracking-tight">JARVIS</h1>
      <p className="fade-up mb-12 text-lg text-slate-400">
        Unified control center for all active systems
      </p>

      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        <Link
          href="/projects"
          className="glass glass-hover hud-corners scan-sweep group fade-up p-6 text-left"
        >
          <div className="mb-3 text-3xl">🎯</div>
          <div className="font-semibold text-white transition-colors group-hover:text-cyan-200">
            Projects
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500">9 active workstreams</div>
        </Link>

        <a
          href="https://books.ayol.net"
          target="_blank"
          rel="noopener noreferrer"
          className="glass glass-hover hud-corners scan-sweep group fade-up p-6 text-left"
        >
          <div className="mb-3 text-3xl">💰</div>
          <div className="font-semibold text-white transition-colors group-hover:text-cyan-200">
            Finance
          </div>
          <div className="mt-1 font-mono text-xs text-slate-500">books.ayol.net</div>
        </a>
      </div>
    </div>
  )
}
