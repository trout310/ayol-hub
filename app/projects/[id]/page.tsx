import Link from 'next/link'
import ChatInterface from '@/components/ChatInterface'
import { PROJECT_MAP } from '@/lib/projects'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params
  const project = PROJECT_MAP[id]

  if (!project) {
    return (
      <div className="glass border-red-500/30 p-4 text-red-400">Project not found: {id}</div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/projects"
          className="font-mono text-xs uppercase tracking-wider text-slate-400 transition-colors hover:text-cyan-200"
        >
          ← Projects
        </Link>
        <span className="text-cyan-500/40">/</span>
        <span className="text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]">
          {project.emoji}
        </span>
        <h1 className="text-xl font-semibold text-white">{project.name}</h1>
      </div>
      <ChatInterface projectId={id} />
    </div>
  )
}
