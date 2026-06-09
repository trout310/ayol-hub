'use client'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  emoji: string
  status?: string
  session_id?: string | null
}

interface Props {
  projects: Project[]
}

const NO_DAEMON_PROJECTS = new Set(['dk-memorial', 'gibson-house', 'home-automation'])

export default function ProjectRoster({ projects }: Props) {
  return (
    <div className="glass hud-corners p-5">
      <div className="mb-4">
        <span className="hud-label">Project Roster</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="glass glass-hover hud-corners scan-sweep block p-4 transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{project.emoji}</span>
              <span className="font-semibold text-slate-100 text-sm">{project.name}</span>
            </div>

            {project.status && (
              <p className="font-mono text-xs text-slate-400 leading-relaxed line-clamp-2">
                {project.status.length > 120
                  ? project.status.slice(0, 120) + '…'
                  : project.status}
              </p>
            )}

            {NO_DAEMON_PROJECTS.has(project.id) && (
              <span className="mt-2 inline-block font-mono text-[10px] text-slate-600 border border-slate-700/50 rounded px-1.5 py-0.5">
                project work — no daemons
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
