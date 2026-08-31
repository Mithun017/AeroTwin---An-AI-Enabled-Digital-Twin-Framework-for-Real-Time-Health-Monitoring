// MaintenanceAdvisory.jsx — Recommended maintenance actions panel
import { useTelemetryStore } from '../state/telemetryStore'

const ACTIONS = {
  none:                   { text: 'No immediate action required. Continue monitoring.', level: 'ok' },
  misfire:                { text: 'Reduce throttle. Inspect spark plugs and ignition timing. Ground inspection before next flight.', level: 'warn' },
  overheating:            { text: 'Reduce engine power. Check coolant flow and oil levels. Allow cooling period.', level: 'warn' },
  sensor_drift:           { text: 'Cross-validate sensor readings. Schedule calibration within 10 flight hours.', level: 'info' },
  cooling_degradation:    { text: 'Inspect cooling fins and airflow paths. Check coolant level. Monitor CHT closely.', level: 'warn' },
  lubrication_issue:      { text: 'Reduce power immediately. Check oil pressure and oil level. Ground engine if pressure below 2 bar.', level: 'crit' },
  injector_abnormality:   { text: 'Reduce throttle. Schedule injector inspection. Check fuel filter.', level: 'warn' },
  abnormal_vibration:     { text: 'Reduce RPM. Inspect propeller balance and engine mounts. Check for loose fasteners.', level: 'warn' },
  combustion_instability: { text: 'Adjust fuel-air mixture. Inspect ignition system and compression.', level: 'warn' },
}

const LEVEL_COLORS = { ok: '#22c55e', info: '#3b82f6', warn: '#f59e0b', crit: '#ef4444' }

export default function MaintenanceAdvisory() {
  const { mlOutput, healthIndex } = useTelemetryStore()
  const fault = mlOutput?.fault_class || 'none'
  const action = ACTIONS[fault] || ACTIONS['none']
  const color = LEVEL_COLORS[action.level]

  return (
    <div style={{ background: '#111827', border: `1px solid ${color}30`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Maintenance Advisory
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 4, minHeight: 40, background: color, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 6, textTransform: 'capitalize' }}>
            {fault.replace(/_/g, ' ')}
            {mlOutput?.confidence != null && fault !== 'none' && (
              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                ({(mlOutput.confidence * 100).toFixed(0)}% confidence)
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{action.text}</p>

          {mlOutput?.top_contributors?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Top contributors:
              </span>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {mlOutput.top_contributors.map(c => (
                  <span key={c} style={{
                    fontSize: 11, background: `${color}18`, color, border: `1px solid ${color}30`,
                    borderRadius: 4, padding: '2px 8px', fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
