// ScenarioSelector.jsx — Switch fault scenarios with instant/ramp mode
import { useState } from 'react'
import { useTelemetryStore } from '../state/telemetryStore'
import { ZapIcon, CheckIcon } from './Icons'

const SCENARIOS = [
  { name: 'normal_flight',      label: 'Normal Flight Baseline', color: '#22c55e' },
  { name: 'misfire_onset',      label: 'Misfire Onset',          color: '#ef4444' },
  { name: 'overheating_trend',  label: 'Thermal Overheating',    color: '#f97316' },
  { name: 'sensor_drift',       label: 'Sensor Drift Bias',      color: '#f59e0b' },
  { name: 'cooling_degradation',label: 'Cooling Degradation',   color: '#60a5fa' },
  { name: 'lubrication_issue',  label: 'Lubrication Starvation', color: '#a78bfa' },
  { name: 'injector_abnormality',label:'Injector Abnormality',   color: '#fb923c' },
  { name: 'abnormal_vibration', label: 'Abnormal Vibration',     color: '#f43f5e' },
]

export default function ScenarioSelector() {
  const [active, setActive] = useState('normal_flight')
  const [instant, setInstant] = useState(false)
  const [loading, setLoading] = useState(false)
  const { clearAlerts } = useTelemetryStore()

  async function selectScenario(name) {
    setLoading(true)
    try {
      await fetch('http://localhost:8000/control/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: name, mode: instant ? 'instant' : 'ramp' }),
      })
      setActive(name)
      clearAlerts()
    } catch (e) {
      console.error('Scenario switch failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>
          Fault Scenario Controller
        </span>
        {/* Instant toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <div
            onClick={() => setInstant(v => !v)}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: instant ? '#38bdf8' : '#1e293b',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: instant ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 11, color: instant ? '#38bdf8' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <ZapIcon size={12} color="currentColor" /> Instant
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SCENARIOS.map(s => (
          <button
            key={s.name}
            onClick={() => selectScenario(s.name)}
            disabled={loading}
            style={{
              background: active === s.name ? `${s.color}18` : 'transparent',
              border: `1px solid ${active === s.name ? s.color + '60' : '#1e293b'}`,
              borderRadius: 8, padding: '8px 12px',
              color: active === s.name ? s.color : '#94a3b8',
              fontSize: 12, fontWeight: active === s.name ? 700 : 400,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {active === s.name ? <CheckIcon size={14} color={s.color} /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#334155' }} />}
              {s.label}
            </span>
            {active === s.name && (
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${s.color}25`, color: s.color, fontWeight: 700 }}>
                ACTIVE
              </span>
            )}
          </button>
        ))}
      </div>

      {instant && (
        <div style={{ marginTop: 10, fontSize: 10, color: '#f59e0b', background: '#f59e0b10', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ZapIcon size={12} color="#f59e0b" /> Instant Mode: Fault applied at 100% severity on tick 1
        </div>
      )}
    </div>
  )
}
