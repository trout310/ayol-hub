'use client'
import { useEffect, useState } from 'react'

interface ProcRow {
  pid: string
  cpu: number
  mem: number
  cmd: string
}

interface ResourceData {
  top_cpu: ProcRow[]
  top_ram: ProcRow[]
  disk_free_gb: number | null
  as_of: string
}

function shortCmd(cmd: string): string {
  const parts = cmd.split(' ')
  const bin = parts[0].split('/').pop() ?? parts[0]
  return bin.length > 28 ? bin.slice(0, 28) + '…' : bin
}

function PctBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  const color = capped > 70 ? 'bg-red-400' : capped > 40 ? 'bg-yellow-400' : 'bg-cyan-400'
  return (
    <div className="h-1 w-16 rounded bg-white/10 overflow-hidden shrink-0">
      <div className={`h-full rounded ${color}`} style={{ width: `${capped}%` }} />
    </div>
  )
}

export default function ResourceMonitor() {
  const [data, setData] = useState<ResourceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/relay/mission/resources')
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(e => { setError(e.message); setLoading(false) })
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <div className="glass rounded-xl p-4"><p className="hud-label text-slate-500">Loading…</p></div>
  if (error || !data) return <div className="glass rounded-xl p-4"><p className="hud-label text-red-400/70">{error ?? 'No data'}</p></div>

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="hud-label">Resource Monitor</p>
        {data.disk_free_gb !== null && (
          <span className="font-mono text-xs text-slate-500">{data.disk_free_gb} GB free</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">Top CPU</p>
          <div className="space-y-1.5">
            {data.top_cpu.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <PctBar pct={p.cpu} />
                <span className="font-mono text-[10px] text-cyan-300/80 w-10 shrink-0 text-right">{p.cpu.toFixed(1)}%</span>
                <span className="font-mono text-[10px] text-slate-400 truncate" title={p.cmd}>{shortCmd(p.cmd)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">Top RAM</p>
          <div className="space-y-1.5">
            {data.top_ram.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <PctBar pct={p.mem * 4} />
                <span className="font-mono text-[10px] text-cyan-300/80 w-10 shrink-0 text-right">{p.mem.toFixed(1)}%</span>
                <span className="font-mono text-[10px] text-slate-400 truncate" title={p.cmd}>{shortCmd(p.cmd)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
