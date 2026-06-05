import Link from 'next/link'
import type { Project } from '@/lib/projects'

interface Props {
  project: Project
}

export default function ProjectCard({ project }: Props) {
  const lines = (project.status ?? '').split('\n').filter(Boolean)
  const lastLine = lines[lines.length - 1] ?? ''

  return (
    <Link
      href={`/projects/${project.id}`}
      className="glass glass-hover hud-corners scan-sweep group block p-5"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
          {project.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white transition-colors group-hover:text-cyan-200">
            {project.name}
          </p>
          {lastLine && (
            <p className="mt-1 truncate font-mono text-xs text-slate-500">{lastLine}</p>
          )}
        </div>
        {project.session_id && (
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-emerald-400">
            <span className="live-dot" />
            live
          </span>
        )}
      </div>
    </Link>
  )
}
