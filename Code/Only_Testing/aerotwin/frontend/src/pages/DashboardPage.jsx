// DashboardPage.jsx — Glassmorphism Responsive Live Telemetry Dashboard
import GaugePanel        from '../components/GaugePanel'
import HealthIndexGauge  from '../components/HealthIndexGauge'
import RULCountdown      from '../components/RULCountdown'
import ResidualChart     from '../components/ResidualChart'
import ScenarioSelector  from '../components/ScenarioSelector'
import ModeToggle        from '../components/ModeToggle'

export default function DashboardPage() {
  return (
    <div className="responsive-grid-dashboard" style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: 16, padding: 16, height: '100%', overflow: 'hidden',
    }}>
      {/* LEFT CONTROL SIDEBAR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 4 }}>
        <HealthIndexGauge />
        <RULCountdown />
        <ModeToggle />
        <ScenarioSelector />
      </div>

      {/* MAIN TELEMETRY & RESIDUAL VECTOR PANELS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        {/* Live 9-Sensor Parameter Panel */}
        <div className="glass-panel" style={{ padding: 18, overflow: 'auto', flex: 1 }}>
          <GaugePanel />
        </div>

        {/* Live Residual Vector Chart */}
        <div className="glass-panel" style={{ padding: 18 }}>
          <ResidualChart />
        </div>
      </div>
    </div>
  )
}
