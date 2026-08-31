// GaugePanel.jsx — Live sensor readouts for all 9 Section B parameters
import { useTelemetryStore } from '../state/telemetryStore'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

const GAUGES = [
  { key: 'rpm',              label: 'RPM',        unit: 'rpm',  min: 0,   max: 5000, color: '#3b82f6' },
  { key: 'cht',              label: 'CHT',         unit: '°C',   min: 80,  max: 300,  color: '#f59e0b' },
  { key: 'egt',              label: 'EGT',         unit: '°C',   min: 400, max: 900,  color: '#ef4444' },
  { key: 'oil_pressure',     label: 'Oil Press',   unit: 'bar',  min: 0,   max: 8,    color: '#22c55e' },
  { key: 'oil_temp',         label: 'Oil Temp',    unit: '°C',   min: 40,  max: 150,  color: '#f97316' },
  { key: 'fuel_flow',        label: 'Fuel Flow',   unit: 'L/hr', min: 0,   max: 25,   color: '#a78bfa' },
  { key: 'vibration',        label: 'Vibration',   unit: 'g',    min: 0,   max: 2,    color: '#fb7185' },
  { key: 'battery_voltage',  label: 'Battery',     unit: 'V',    min: 20,  max: 32,   color: '#34d399' },
  { key: 'injection_timing', label: 'Inj. Timing', unit: '°',    min: 8,   max: 25,   color: '#60a5fa' },
]

function SingleGauge({ gauge, value, residual }) {
  const pct = Math.max(0, Math.min(100, ((value - gauge.min) / (gauge.max - gauge.min)) * 100))
  const residualAbs = Math.abs(residual ?? 0)
  const isAnomalous = residualAbs > (gauge.max - gauge.min) * 0.06

  return (
    <div style={{
      background: '#111827', border: `1px solid ${isAnomalous ? '#ef444440' : '#1e2d45'}`,
      borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {gauge.label}
        </span>
        {isAnomalous && (
          <span style={{ fontSize: 9, background: '#ef444418', color: '#ef4444', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
            ΔRES
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: isAnomalous ? '#ef4444' : gauge.color, fontFamily: 'JetBrains Mono, monospace', transition: 'color 0.3s' }}>
          {value != null ? value.toFixed(gauge.key === 'rpm' ? 0 : 2) : '—'}
        </span>
        <span style={{ fontSize: 11, color: '#475569' }}>{gauge.unit}</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#1e2d45', borderRadius: 2 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: isAnomalous ? '#ef4444' : gauge.color,
          borderRadius: 2, transition: 'width 0.2s, background 0.3s',
          boxShadow: isAnomalous ? `0 0 6px #ef4444` : `0 0 4px ${gauge.color}60`,
        }} />
      </div>

      {/* Residual indicator */}
      {residual != null && (
        <div style={{ marginTop: 4, fontSize: 10, color: isAnomalous ? '#ef4444' : '#475569' }}>
          Δ {residual > 0 ? '+' : ''}{residual.toFixed(2)}
        </div>
      )}
    </div>
  )
}

export default function GaugePanel() {
  const { sensors, residual } = useTelemetryStore()

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Section B — Live Sensor Parameters
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {GAUGES.map(g => (
          <SingleGauge
            key={g.key}
            gauge={g}
            value={sensors?.[g.key]}
            residual={residual?.[g.key]}
          />
        ))}
      </div>
    </div>
  )
}
