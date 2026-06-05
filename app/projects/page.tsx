'use client'
import { useEffect, useState } from 'react'
import ProjectCard from '@/components/ProjectCard'
import { fetchProjects } from '@/lib/relay'
import type { Project } from '@/lib/projects'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-8">
        <p className="hud-label mb-2">System Directory</p>
        <h1 className="glow-text text-3xl font-bold tracking-tight">Active Projects</h1>
      </div>

      {loading && (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3">
          <div className="arc-reactor scale-50 opacity-80" aria-hidden>
            <div className="arc-core" />
          </div>
          <p className="animate-pulse font-mono text-xs tracking-[0.3em] text-cyan-400/80 uppercase">
            Scanning systems…
          </p>
        </div>
      )}

      {error && (
        <div className="glass border-red-500/30 p-4 font-mono text-sm text-red-400">
          <span className="hud-label text-red-400/80">Relay offline</span>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}
