import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'AYOL Hub',
  description: 'J.A.R.V.I.S. — Just A Rather Very Intelligent System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${mono.variable} font-sans text-slate-100 min-h-screen antialiased`}
      >
        <div className="hud-backdrop" aria-hidden />
        <div className="hud-grid" aria-hidden />

        <nav className="sticky top-0 z-50 border-b border-cyan-400/15 bg-[#050810]/70 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link
              href="/"
              className="group flex items-center gap-2.5 font-mono font-bold tracking-wider transition-colors"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
              </span>
              <span className="text-sm text-sky-300 transition-colors group-hover:text-cyan-200">
                AYOL HUB
              </span>
            </Link>
            <div className="flex items-center gap-7 text-sm">
              <Link
                href="/projects"
                className="text-slate-400 transition-colors hover:text-cyan-200"
              >
                Projects
              </Link>
              <a
                href="https://books.ayol.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-cyan-200"
              >
                Finance
              </a>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-10">{children}</main>
      </body>
    </html>
  )
}
