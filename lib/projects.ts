export interface Project {
  id: string
  name: string
  emoji: string
  status?: string
  session_id?: string | null
}

export const PROJECTS: Project[] = [
  { id: 'meal-planner', name: 'Meal Planner', emoji: '🍽️' },
  { id: 'home-automation', name: 'Home Automation', emoji: '🏠' },
  { id: 'scheduling-automation', name: 'Scheduling & Automation', emoji: '⚙️' },
  { id: 'investing-tax', name: 'Investing & Tax', emoji: '💰' },
  { id: 'gibson-house', name: 'Gibson House', emoji: '🔨' },
  { id: 'dk-memorial', name: 'Dave Knudsen Memorial', emoji: '🕯️' },
  { id: 'pyf', name: 'PYF', emoji: '🌊' },
  { id: 'caeli-coaching', name: 'Caeli Coaching', emoji: '🧠' },
  { id: 'project-hub', name: 'Project Hub', emoji: '🎯' },
]

export const PROJECT_MAP: Record<string, Project> = Object.fromEntries(
  PROJECTS.map(p => [p.id, p])
)
