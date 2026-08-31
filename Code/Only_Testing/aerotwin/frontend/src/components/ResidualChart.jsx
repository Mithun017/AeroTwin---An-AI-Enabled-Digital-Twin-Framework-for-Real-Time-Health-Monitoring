// ResidualChart.jsx — Real-time residual bar chart (9 channels)
import { useTelemetryStore } from '../state/telemetryStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'

const FIELDS = ['rpm','cht','egt','oil_pressure','oil_temp','fuel_flow','vibration','battery_voltage','injection_timing']
const LABELS  = ['RPM','CHT','EGT','Oil P','Oil T','FF','Vib','Batt','Inj']

// Normal band ±threshold (normalised units)
const THRESHOLDS = [15, 3, 6, 0.1, 1.5, 0.2, 0.02, 0.15, 0.25]

export default function ResidualChart() {
  const { residual } = useTelemetryStore()

  const data = FIELDS.map((f, i) => ({
    name: LABELS[i],
    value: residual?.[f] ?? 0,
    threshold: THRESHOLDS[i],
  }))

  return (
    <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Residual Vector (Actual − Predicted)
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 6, fontSize: 11 }}
            formatter={(v, _, props) => {
              const t = props.payload.threshold
              const flag = Math.abs(v) > t ? ' ⚠' : ' ✓'
              return [`${v.toFixed(4)}${flag}`, 'Residual']
            }}
          />
          <ReferenceLine y={0} stroke="#1e2d45" />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={Math.abs(d.value) > d.threshold ? '#ef4444' : '#3b82f6'}
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
        <span style={{ color: '#3b82f6' }}>■</span> Normal &nbsp;
        <span style={{ color: '#ef4444' }}>■</span> Anomalous
      </div>
    </div>
  )
}
