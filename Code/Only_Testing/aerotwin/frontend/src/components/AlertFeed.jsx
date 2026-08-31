// AlertFeed.jsx — Real-time scrolling alert feed with XAI explanation
import { useTelemetryStore } from '../state/telemetryStore'
import { CheckIcon } from './Icons'

const SEVERITY_COLORS = {
  normal: '#22c55e', low: '#84cc16', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626'
}

export default function AlertFeed() {
  const { alerts } = useTelemetryStore()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Fault Alert Feed
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <CheckIcon size={14} color="#22c55e" /> No active alerts — engine nominal
          </div>
        ) : alerts.map((a, i) => (
          <AlertCard key={a.alert_id || i} alert={a} />
        ))}
      </div>
    </div>
  )
}

function AlertCard({ alert }) {
  const color = SEVERITY_COLORS[alert.severity] || '#64748b'
  const ts = new Date(alert.timestamp).toLocaleTimeString()

  return (
    <div style={{
      border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`,
      background: `${color}08`,
      borderRadius: 8, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {alert.severity} — {(alert.fault_class || '').replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: 10, color: '#475569' }}>{ts}</span>
      </div>
      <p style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>{alert.message}</p>
      {alert.recommended_action && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          Action: {alert.recommended_action}
        </p>
      )}
      {alert.rul_hours != null && (
        <div style={{ marginTop: 6, fontSize: 11, color: color, fontWeight: 600 }}>
          RUL: {alert.rul_hours.toFixed(1)} hrs remaining
        </div>
      )}
    </div>
  )
}
