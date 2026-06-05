import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <p className="mb-4 font-mono text-xs tracking-[0.35em] text-blue-400 uppercase">
        Just A Rather Very Intelligent System
      </p>
      <h1 className="mb-3 text-6xl font-bold tracking-tight text-white">
        AYOL HUB
      </h1>
      <p className="mb-12 text-lg text-slate-500">
        Unified control center for all active projects
      </p>

      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        <Link
          href="/projects"
          className="group rounded-xl border border-slate-700 bg-slate-900 p-6 text-left transition-all hover:border-blue-500/50 hover:bg-slate-800"
        >
          <div className="mb-3 text-3xl">🎯</div>
          <div className="font-semibold text-white transition-colors group-hover:text-blue-300">
            Projects
          </div>
          <div className="mt-1 text-sm text-slate-500">9 active workstreams</div>
        </Link>

        <a
          href="https://books.ayol.net"
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-xl border border-slate-700 bg-slate-900 p-6 text-left transition-all hover:border-blue-500/50 hover:bg-slate-800"
        >
          <div className="mb-3 text-3xl">💰</div>
          <div className="font-semibold text-white transition-colors group-hover:text-blue-300">
            Finance
          </div>
          <div className="mt-1 text-sm text-slate-500">books.ayol.net</div>
        </a>
      </div>
    </div>
  )
}
