// AlertsPage.jsx — Dedicated Fault Alert Feed & Maintenance Advisory Center
import AlertFeed from '../components/AlertFeed'
import MaintenanceAdvisory from '../components/MaintenanceAdvisory'
import ScenarioSelector from '../components/ScenarioSelector'
import { useTelemetryStore } from '../state/telemetryStore'

export default function AlertsPage() {
  const { mlOutput, severity, healthIndex } = useTelemetryStore()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12, padding: 12, height: '100%', overflow: 'hidden' }}>
      {/* LEFT: SCENARIO CONTROLLER & SYSTEM STATUS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
            FAULT DETECTION STATUS
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: healthIndex > 0.75 ? '#22c55e' : '#ef4444', textTransform: 'uppercase' }}>
            {severity} — {healthIndex > 0.75 ? 'NOMINAL' : 'FAULT DETECTED'}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Active Fault: <span style={{ color: '#38bdf8', fontWeight: 700, textTransform: 'capitalize' }}>{(mlOutput?.fault_class || 'none').replace(/_/g, ' ')}</span>
          </div>
        </div>

        <ScenarioSelector />
      </div>

      {/* RIGHT: ADVISORY & SCROLLING ALERT FEED */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <MaintenanceAdvisory />

        <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AlertFeed />
        </div>
      </div>
    </div>
  )
}
