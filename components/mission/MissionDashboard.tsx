'use client'
import { useEffect, useState, useCallback } from 'react'
import NeedsAttention from './NeedsAttention'
import Fleet from './Fleet'
import SystemHealth from './SystemHealth'
import ProjectRoster from './ProjectRoster'
import type { Project } from '@/lib/projects'

interface AttentionItem {
  severity: string
  category: string
  title: string
  source: string
}

interface AgentRow {
  label: string
  role: string
  goal: string
  status: string
  source: string
  paused: boolean
  today_spend_usd: number | null
}

interface FleetData {
  by_goal: Record<string, AgentRow[]>
  total_agents: number
  global_spend_usd: number | null
  global_cap_usd: number | null
  notes: string[]
  as_of: string
}

interface HealthData {
  self_heal_failure_count_24h: number
  self_heal_failures_24h: unknown[]
  daemon_nonzero_exits: Array<{ label: string; exit_code: number }>
  pa_queue_depth: number
  disk_free_gb: number | null
  cost_trend_7d: Array<{ date: string; spend_usd: number }>
  notes: string[]
  as_of: string
}

interface NeedsAttentionData {
  items: AttentionItem[]
  notes: string[]
  as_of: string
}

interface MissionData {
  generated_at: string
  ok: boolean
  fleet: FleetData
  health: HealthData
  needs_attention: NeedsAttentionData
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function MissionDashboard() {
  const [mission, setMission] = useState<MissionData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/relay/mission', { cache: 'no-store' }),
        fetch('/api/relay/projects', { cache: 'no-store' }),
      ])
      if (!mRes.ok) throw new Error(`Mission: ${mRes.status}`)
      if (!pRes.ok) throw new Error(`Projects: ${pRes.status}`)
      const [mData, pData] = await Promise.all([mRes.json(), pRes.json()])
      setMission(mData)
      setProjects(pData)
      setLastFetched(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 45_000)
    return () => clearInterval(interval)
  }, [fetchAll])

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <span className="hud-label">Loading…</span>
      </div>
    )
  }

  if (error && !mission) {
    const timeStr = lastFetched
      ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--'
    return (
      <div className="flex min-h-48 items-center justify-center">
        <span className="hud-label text-red-400/80">
          Relay unreachable — last data from {timeStr}
        </span>
      </div>
    )
  }

  if (!mission) return null

  const asOf = formatTime(mission.generated_at)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="hud-label">Mission Control</p>
        <div className="flex items-center gap-2">
          {error && (
            <span className="font-mono text-xs text-yellow-400">⚠ relay unreachable — showing cached data</span>
          )}
          <span className="font-mono text-xs text-slate-600">as of {asOf}</span>
        </div>
      </div>

      {/* NeedsAttention — full width */}
      <NeedsAttention items={mission.needs_attention.items} />

      {/* Fleet + SystemHealth — side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Fleet fleet={mission.fleet} />
        <SystemHealth health={mission.health} />
      </div>

      {/* ProjectRoster — full width */}
      <ProjectRoster projects={projects} />
    </div>
  )
}
