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
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        Project not found: {id}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/projects" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Projects
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-2xl">{project.emoji}</span>
        <h1 className="text-xl font-semibold text-white">{project.name}</h1>
      </div>
      <ChatInterface projectId={id} />
    </div>
  )
}
