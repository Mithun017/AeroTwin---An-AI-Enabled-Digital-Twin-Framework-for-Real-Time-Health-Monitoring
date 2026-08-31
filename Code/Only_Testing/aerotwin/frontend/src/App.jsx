// App.jsx — Multi-page Navigation with Permanent Left Sidebar
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useTelemetrySocket } from './hooks/useTelemetrySocket'
import { useReplay } from './hooks/useReplay'
import { useTelemetryStore } from './state/telemetryStore'

import Sidebar       from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import Twin3DPage    from './pages/Twin3DPage'
import AlertsPage    from './pages/AlertsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import HistoryPage   from './pages/HistoryPage'
import SimulatorPage from './pages/SimulatorPage'

function ConnectionDot() {
  const { connected, mode } = useTelemetryStore()
  const isLive = mode === 'live'
  const color  = !isLive ? '#a78bfa' : connected ? '#22c55e' : '#ef4444'
  const label  = !isLive ? mode.toUpperCase() : connected ? 'LIVE' : 'RECONNECTING'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: `0 0 6px ${color}`,
        animation: (isLive && connected) || !isLive ? 'none' : 'pulse-critical 1s infinite',
      }} />
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.08em' }}>{label}</span>
    </div>
  )
}

function MainLayout() {
  useTelemetrySocket()
  useReplay()

  const { missionId } = useTelemetryStore()

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: '#0a0e1a',
      overflow: 'hidden',
    }}>
      {/* Permanent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area (Header + Route Page) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', overflow: 'hidden' }}>
        
        {/* TOP APPLICATION HEADER */}
        <header style={{
          height: 56, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: '#0f172a', borderBottom: '1px solid #1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              DRDO MALE UAV Aero Piston Engine Digital Twin
            </span>
            <div style={{ width: 1, height: 16, background: '#1e293b' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>SIH 2026 PS-26054</span>
          </div>

          {/* Status Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {missionId && (
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                {missionId}
              </span>
            )}
            <ConnectionDot />
          </div>
        </header>

        {/* ROUTE VIEWPORT */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Routes>
            <Route path="/"          element={<DashboardPage />} />
            <Route path="/twin"      element={<Twin3DPage />} />
            <Route path="/alerts"    element={<AlertsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/history"   element={<HistoryPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  )
}
