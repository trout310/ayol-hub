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
      <h1 className="mb-6 font-mono text-2xl font-bold text-white">
        <span className="text-blue-400">//</span> Active Projects
      </h1>

      {loading && (
        <div className="flex min-h-48 items-center justify-center">
          <p className="animate-pulse font-mono text-sm text-blue-400">
            Scanning systems...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/20 p-4 font-mono text-sm text-red-400">
          Relay offline: {error}
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
