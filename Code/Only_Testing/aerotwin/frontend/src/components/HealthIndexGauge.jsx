// HealthIndexGauge.jsx — Animated circular health index display
import { useTelemetryStore } from '../state/telemetryStore'
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

function getColor(v) {
  if (v > 0.75) return '#22c55e'
  if (v > 0.5)  return '#f59e0b'
  if (v > 0.25) return '#ef4444'
  return '#dc2626'
}

export default function HealthIndexGauge() {
  const { healthIndex, healthHistory, severity } = useTelemetryStore()
  const pct = Math.round((healthIndex ?? 1) * 100)
  const color = getColor(healthIndex ?? 1)
  const r = 52, cx = 64, cy = 64
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  const chartData = healthHistory.map((v, i) => ({ i, v }))

  return (
    <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Engine Health Index
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Circular gauge */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={128} height={128}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth={10} />
            <circle
              cx={cx} cy={cy} r={r}
              fill="none" stroke={color} strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.4s, stroke 0.4s', filter: `drop-shadow(0 0 6px ${color})` }}
            />
            <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize={22} fontWeight={700} fontFamily="JetBrains Mono, monospace">
              {pct}%
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#475569" fontSize={10}>
              HEALTH
            </text>
          </svg>
        </div>

        {/* Trend sparkline */}
        <div style={{ flex: 1, height: 80 }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Trend (last 200 ticks)</div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={chartData}>
              <YAxis domain={[0, 1]} hide />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 6, fontSize: 11 }}
                formatter={(v) => [`${(v * 100).toFixed(1)}%`, 'Health']}
                labelFormatter={() => ''}
              />
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Severity badge */}
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: severity === 'critical' || severity === 'high' ? 'pulse-dot 1s infinite' : 'none',
        }} />
        <span style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>
          {severity} — {pct >= 85 ? 'Nominal' : pct >= 60 ? 'Degrading' : pct >= 35 ? 'Fault Suspected' : 'Critical'}
        </span>
      </div>
    </div>
  )
}
