import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'AYOL Hub',
  description: 'J.A.R.V.I.S. — Just A Rather Very Intelligent System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${mono.variable} font-sans bg-slate-950 text-slate-100 min-h-screen antialiased`}
      >
        <nav className="sticky top-0 z-50 border-b border-blue-500/20 bg-slate-950/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-mono font-bold text-blue-400 tracking-wider hover:text-blue-300 transition-colors"
            >
              <span className="text-lg">⚡</span>
              <span className="text-sm">AYOL HUB</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/projects"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Projects
              </Link>
              <a
                href="https://books.ayol.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Finance
              </a>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
