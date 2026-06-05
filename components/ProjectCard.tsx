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
      className="group block rounded-xl border border-slate-700 bg-slate-900 p-5 transition-all hover:border-blue-500/40 hover:bg-slate-800"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{project.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white transition-colors group-hover:text-blue-300">
            {project.name}
          </p>
          {lastLine && (
            <p className="mt-1 truncate font-mono text-xs text-slate-500">
              {lastLine}
            </p>
          )}
        </div>
        {project.session_id && (
          <span className="shrink-0 font-mono text-xs text-green-400">● live</span>
        )}
      </div>
    </Link>
  )
}
