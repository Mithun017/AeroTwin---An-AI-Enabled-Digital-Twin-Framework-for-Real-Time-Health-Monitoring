// DashboardPage.jsx — Clean Live Sensor Telemetry Dashboard
import GaugePanel        from '../components/GaugePanel'
import HealthIndexGauge  from '../components/HealthIndexGauge'
import RULCountdown      from '../components/RULCountdown'
import ResidualChart     from '../components/ResidualChart'
import ScenarioSelector  from '../components/ScenarioSelector'
import ModeToggle        from '../components/ModeToggle'

export default function DashboardPage() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: 12, padding: 12, height: '100%', overflow: 'hidden',
    }}>
      {/* LEFT SIDEBAR CONTROLS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <HealthIndexGauge />
        <RULCountdown />
        <ModeToggle />
        <ScenarioSelector />
      </div>

      {/* MAIN TELEMETRY GAUGES & RESIDUAL VECTOR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        {/* Live 9-Sensor Parameter Panel */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, overflow: 'auto', flex: 1 }}>
          <GaugePanel />
        </div>

        {/* Live Residual Vector Chart */}
        <ResidualChart />
      </div>
    </div>
  )
}
