'use client'
import { useEffect, useState, useCallback } from 'react'
import { ToastProvider } from '@/lib/toast'
import NeedsAttention from './NeedsAttention'
import Fleet from './Fleet'
import SystemHealth from './SystemHealth'
import ProjectRoster from './ProjectRoster'
import CommandOutbox from './CommandOutbox'
import WeeklyRetro from './WeeklyRetro'
import WorkingItems from './WorkingItems'
import ActivityTimeline from './ActivityTimeline'
import GoalsOverview from './GoalsOverview'
import ResourceMonitor from './ResourceMonitor'
import ProposalViewer from './ProposalViewer'
import type { Project } from '@/lib/projects'

interface AttentionItem {
  severity: string
  category: string
  title: string
  source: string
  id?: string
  detail?: string
  recommendation?: string
}

interface WorkingItem {
  id: string
  title: string
  detail?: string
  project?: string
  category?: string
  status: 'pending' | 'in_progress' | 'blocked' | 'resolved'
  since?: string
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
  working_items?: WorkingItem[]
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
  const [outboxTick, setOutboxTick] = useState(0)

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

  // After any action, re-fetch mission data + bump outbox
  function handleActionDone() {
    fetchAll()
    setOutboxTick((t) => t + 1)
  }

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <span className="hud-label">Loading…</span>
      </div>
    )
  }

  if (error && !mission) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <span className="hud-label text-red-400/80">
          {lastFetched
            ? `Relay unreachable — last data from ${lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Relay unreachable — could not load data'}
        </span>
      </div>
    )
  }

  if (!mission) return null

  const asOf = formatTime(mission.generated_at)

  return (
    <ToastProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="hud-label">Mission Control</p>
          <div className="flex items-center gap-2">
            {error && (
              <span className="font-mono text-xs text-yellow-400">
                ⚠ relay unreachable — showing cached data
              </span>
            )}
            <span className="font-mono text-xs text-slate-600">as of {asOf}</span>
          </div>
        </div>

        {/* NeedsAttention — full width */}
        <NeedsAttention
          items={mission.needs_attention.items}
          onActionDone={handleActionDone}
        />

        {/* Fleet + SystemHealth — side by side */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Fleet fleet={mission.fleet} onActionDone={handleActionDone} />
          <SystemHealth health={mission.health} />
        </div>

        {/* CommandOutbox — full width */}
        <CommandOutbox refreshTick={outboxTick} />

        {/* WeeklyRetro — collapsible, full width */}
        <WeeklyRetro />

        {/* ProjectRoster — full width */}
        <ProjectRoster projects={projects} />

        {/* WorkingItems — background queue, full width */}
        {mission.working_items && mission.working_items.length > 0 && (
          <WorkingItems items={mission.working_items} />
        )}

        {/* Phase 3 — Depth */}
        <GoalsOverview />

        {/* Goals + Resource side by side */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ActivityTimeline />
          <ResourceMonitor />
        </div>

        {/* Proposals — only renders when there are pending items */}
        <ProposalViewer refreshTick={outboxTick} onActionDone={handleActionDone} />
      </div>
    </ToastProvider>
  )
}
