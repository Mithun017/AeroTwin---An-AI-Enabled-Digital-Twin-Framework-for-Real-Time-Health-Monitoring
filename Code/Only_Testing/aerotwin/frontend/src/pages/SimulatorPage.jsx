// SimulatorPage.jsx — What-If Environmental Mission Simulator
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTelemetryStore } from '../state/telemetryStore'
import { PlayIcon, WarningIcon } from '../components/Icons'

export default function SimulatorPage() {
  const { setMode, setWhatifTicks } = useTelemetryStore()

  const [preset, setPreset] = useState('high_altitude')
  const [altitude, setAltitude] = useState(4500)
  const [temp, setTemp] = useState(12)
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  async function runSimulation() {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/simulate/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset,
          altitude_m: Number(altitude),
          ambient_temp_c: Number(temp),
          duration_s: Number(duration),
        }),
      })
      const data = await res.json()
      setResults(data)
      setWhatifTicks(data.ticks || [])
      setMode('whatif')
    } catch (e) {
      console.error('Simulation failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const chartData = (results?.ticks || []).map(t => ({
    time: `${t.t_s.toFixed(0)}s`,
    rpm: t.predicted?.rpm,
    cht: t.predicted?.cht,
    egt: t.predicted?.egt,
    oil_p: t.predicted?.oil_pressure,
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12, padding: 12, height: '100%', overflow: 'hidden' }}>
      {/* SIMULATOR CONFIGURATION PANEL */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>What-If Mission Planner</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Pre-flight Forward Physics Simulation</div>
        </div>

        {/* Preset Selector */}
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Scenario Preset</label>
          <select
            value={preset}
            onChange={e => setPreset(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
          >
            <option value="high_altitude">High Altitude Climb (5,500m)</option>
            <option value="endurance">Long-Range Cruise (2,000m)</option>
            <option value="hot_weather">Hot Desert Operations (+45°C)</option>
            <option value="rapid_throttle">Rapid Throttle Response</option>
          </select>
        </div>

        {/* Altitude Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
            <span>Target Altitude</span>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>{altitude} m</span>
          </div>
          <input
            type="range" min="0" max="8000" step="250"
            value={altitude} onChange={e => setAltitude(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Temperature Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
            <span>Ambient Temperature</span>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>{temp} °C</span>
          </div>
          <input
            type="range" min="-40" max="55" step="1"
            value={temp} onChange={e => setTemp(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Run Simulation Button */}
        <button
          onClick={runSimulation}
          disabled={loading}
          style={{
            marginTop: 'auto', padding: '12px', borderRadius: 10,
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            border: 'none', color: '#fff', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <PlayIcon size={14} color="#fff" /> {loading ? 'Running Physics Model…' : 'Execute Forward Simulation'}
        </button>
      </div>

      {/* SIMULATION PREVIEW & ANALYSIS RESULT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningIcon size={16} color="#a78bfa" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa' }}>
                SIMULATED PREVIEW — NOT LIVE DATA
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                Forward physics simulation over {duration} seconds horizon
              </div>
            </div>
          </div>
        </div>

        {/* Predicted Curves Chart */}
        <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
            Predicted CHT & EGT Thermal Profiles
          </div>

          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }} />
                <Line type="monotone" dataKey="egt" stroke="#ef4444" strokeWidth={2} name="EGT (°C)" dot={false} />
                <Line type="monotone" dataKey="cht" stroke="#f59e0b" strokeWidth={2} name="CHT (°C)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
