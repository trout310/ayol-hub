import MissionDashboard from '@/components/mission/MissionDashboard'

export default function MissionPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="hud-label mb-2">Command Overview</p>
        <h1 className="glow-text text-3xl font-bold tracking-tight">Mission Control</h1>
      </div>
      <MissionDashboard />
    </div>
  )
}
