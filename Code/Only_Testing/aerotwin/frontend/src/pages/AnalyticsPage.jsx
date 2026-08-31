// AnalyticsPage.jsx — Alerts & AI Diagnostics Center
import { useState } from 'react'
import { useTelemetryStore } from '../state/telemetryStore'
import AlertFeed from '../components/AlertFeed'
import MaintenanceAdvisory from '../components/MaintenanceAdvisory'
import ScenarioSelector from '../components/ScenarioSelector'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function AnalyticsPage() {
  const { mlOutput, anomalyHistory, residual } = useTelemetryStore()
  const [tab, setTab] = useState('alerts') // 'alerts' | 'ml'

  const anomalyData = anomalyHistory.map((v, i) => ({ tick: i, anomaly: (v * 100).toFixed(1) }))

  const channelRes = [
    { name: 'RPM', val: residual?.rpm ?? 0 },
    { name: 'CHT', val: residual?.cht ?? 0 },
    { name: 'EGT', val: residual?.egt ?? 0 },
    { name: 'Oil P', val: residual?.oil_pressure ?? 0 },
    { name: 'Oil T', val: residual?.oil_temp ?? 0 },
    { name: 'FF', val: residual?.fuel_flow ?? 0 },
    { name: 'Vib', val: residual?.vibration ?? 0 },
    { name: 'Batt', val: residual?.battery_voltage ?? 0 },
    { name: 'Inj', val: residual?.injection_timing ?? 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, height: '100%', overflow: 'hidden' }}>
      {/* Tab Switcher */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setTab('alerts')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: tab === 'alerts' ? '#38bdf8' : '#1e293b',
              color: tab === 'alerts' ? '#0f172a' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            Fault Alerts & Advisories
          </button>
          <button
            onClick={() => setTab('ml')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: tab === 'ml' ? '#38bdf8' : '#1e293b',
              color: tab === 'ml' ? '#0f172a' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            Isolation Forest & ML Diagnostics
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#64748b' }}>
          Anomaly Score: <span style={{ fontWeight: 700, color: (mlOutput?.anomaly_score ?? 0) > 0.4 ? '#ef4444' : '#22c55e' }}>{((mlOutput?.anomaly_score ?? 0) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'alerts' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12, height: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
              <ScenarioSelector />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
              <MaintenanceAdvisory />
              <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AlertFeed />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 12, height: '100%', overflowY: 'auto' }}>
            {/* Top ML Status Header Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ANOMALY SCORE</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: (mlOutput?.anomaly_score ?? 0) > 0.4 ? '#ef4444' : '#22c55e', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                  {((mlOutput?.anomaly_score ?? 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>FAULT CLASS</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', textTransform: 'capitalize', marginTop: 4 }}>
                  {(mlOutput?.fault_class || 'none').replace(/_/g, ' ')}
                </div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>RUL ESTIMATE</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                  {mlOutput?.rul_hours != null ? `${mlOutput.rul_hours.toFixed(1)} hrs` : 'Calibrating…'}
                </div>
              </div>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>INFERENCE LATENCY</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', marginTop: 4 }}>
                  &lt; 15 ms <span style={{ fontSize: 11, color: '#64748b' }}>/ tick</span>
                </div>
              </div>
            </div>

            {/* Charts Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
                  Real-Time Anomaly Score History (%)
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={anomalyData}>
                    <XAxis dataKey="tick" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }} />
                    <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="anomaly" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
                  Channel Residual Deviation
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={channelRes}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }} />
                    <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
