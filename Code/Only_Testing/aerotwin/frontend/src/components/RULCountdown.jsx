// RULCountdown.jsx — Remaining Useful Life display
import { useTelemetryStore } from '../state/telemetryStore'
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

export default function RULCountdown() {
  const { mlOutput, rulHistory } = useTelemetryStore()
  const rul = mlOutput?.rul_hours
  const status = mlOutput?.rul_status
  const isCalibrating = status === 'insufficient_data' || rul == null

  const color = rul == null ? '#475569' : rul > 100 ? '#22c55e' : rul > 20 ? '#f59e0b' : '#ef4444'
  const chartData = rulHistory.filter(v => v != null).slice(-100).map((v, i) => ({ i, v }))

  return (
    <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Remaining Useful Life
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        {isCalibrating ? (
          <span style={{ fontSize: 20, color: '#475569', fontStyle: 'italic', fontFamily: 'JetBrains Mono, monospace' }}>
            Calibrating…
          </span>
        ) : (
          <>
            <span style={{ fontSize: 36, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', transition: 'color 0.4s' }}>
              {rul.toFixed(1)}
            </span>
            <span style={{ fontSize: 14, color: '#64748b' }}>hrs</span>
          </>
        )}
      </div>

      {isCalibrating && (
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
          Collecting anomaly history… ({mlOutput == null ? 0 : '&lt;20'} ticks)
        </div>
      )}

      {chartData.length > 1 && (
        <ResponsiveContainer width="100%" height={50}>
          <AreaChart data={chartData}>
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 6, fontSize: 11 }}
              formatter={(v) => [`${v.toFixed(1)} hrs`, 'RUL']}
              labelFormatter={() => ''}
            />
            <Area type="monotone" dataKey="v" stroke={color} fill={`${color}18`} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
