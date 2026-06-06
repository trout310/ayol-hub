// JARVIS-style HUD reticle: concentric rings, radial tick marks, counter-rotating
// arc segments, glowing core. Used as the app logo (nav) and the "thinking" spinner.
interface Props {
  size?: number
  spinning?: boolean // faster spin for the "thinking" state
  className?: string
}

const TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * 30 * Math.PI) / 180
  const outer = 47
  const inner = i % 3 === 0 ? 39 : 43 // longer ticks at the quadrants
  return {
    x1: 50 + outer * Math.cos(a),
    y1: 50 + outer * Math.sin(a),
    x2: 50 + inner * Math.cos(a),
    y2: 50 + inner * Math.sin(a),
  }
})

export default function JarvisLogo({ size = 32, spinning = false, className = '' }: Props) {
  const outerSpin = spinning ? 'jarvis-spin-fast' : 'jarvis-spin-slow'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.5))' }}
    >
      {/* static faint base ring */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth="1" />

      {/* radial tick marks */}
      <g stroke="rgba(125,211,252,0.55)" strokeWidth="1.4" strokeLinecap="round">
        {TICKS.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
      </g>

      {/* outer counter-rotating bright arcs */}
      <g className={outerSpin} style={{ transformOrigin: '50% 50%' }}>
        <path d="M50 6 A44 44 0 0 1 94 50" fill="none" stroke="#7dd3fc" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M50 94 A44 44 0 0 1 6 50" fill="none" stroke="#22d3ee" strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* inner reverse-rotating dashed ring */}
      <g className="jarvis-spin-rev" style={{ transformOrigin: '50% 50%' }}>
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="rgba(56,189,248,0.6)"
          strokeWidth="1.4"
          strokeDasharray="6 10"
        />
      </g>

      {/* glowing core */}
      <circle cx="50" cy="50" r="7" fill="rgba(125,211,252,0.25)" />
      <circle cx="50" cy="50" r="3.2" fill="#7dd3fc" />
    </svg>
  )
}
