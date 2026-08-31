// ModeToggle.jsx — Live / Replay / What-If mode switcher
import { useState } from 'react'
import { useTelemetryStore } from '../state/telemetryStore'

export default function ModeToggle() {
  const { mode, setMode, setReplayTicks, setWhatifTicks } = useTelemetryStore()
  const [missions, setMissions] = useState([])
  const [loadingMissions, setLoadingMissions] = useState(false)
  const [selectedMission, setSelectedMission] = useState(null)
  const [replaySpeed, setReplaySpeed] = useState(1.0)
  const [whatifPreset, setWhatifPreset] = useState('high_altitude')
  const [loadingWhatif, setLoadingWhatif] = useState(false)

  async function switchToReplay() {
    setLoadingMissions(true)
    try {
      const res = await fetch('http://localhost:8000/missions')
      const ms = await res.json()
      setMissions(ms)
      setMode('replay')
    } finally {
      setLoadingMissions(false)
    }
  }

  async function loadMission(id) {
    const res = await fetch(`http://localhost:8000/missions/${id}/ticks?limit=5000`)
    const ticks = await res.json()
    setReplayTicks(ticks)
    setSelectedMission(id)
    useTelemetryStore.getState().setReplaySpeed(replaySpeed)
  }

  async function runWhatIf() {
    setLoadingWhatif(true)
    try {
      const res = await fetch('http://localhost:8000/simulate/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: whatifPreset, duration_s: 60 }),
      })
      const data = await res.json()
      setWhatifTicks(data.ticks || [])
      setMode('whatif')
    } finally {
      setLoadingWhatif(false)
    }
  }

  const MODES = [
    { id: 'live',   label: 'LIVE STREAM', color: '#22c55e' },
    { id: 'replay', label: 'REPLAY LOG',  color: '#38bdf8' },
    { id: 'whatif', label: 'WHAT-IF SIM', color: '#a78bfa' },
  ]

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Operational Mode
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => m.id === 'live' ? setMode('live') : m.id === 'replay' ? switchToReplay() : setMode('whatif')}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${mode === m.id ? m.color + '80' : '#1e293b'}`,
              background: mode === m.id ? `${m.color}18` : 'transparent',
              color: mode === m.id ? m.color : '#64748b', fontWeight: mode === m.id ? 700 : 500,
              fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'replay' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Select stored mission log:</div>
          {missions.length === 0 && <div style={{ fontSize: 11, color: '#475569' }}>No missions stored yet.</div>}
          {missions.map(m => (
            <button
              key={m.mission_id}
              onClick={() => loadMission(m.mission_id)}
              style={{
                padding: '6px 10px', borderRadius: 6, border: `1px solid ${selectedMission === m.mission_id ? '#38bdf880' : '#1e293b'}`,
                background: selectedMission === m.mission_id ? '#38bdf818' : 'transparent',
                color: '#94a3b8', fontSize: 11, cursor: 'pointer', textAlign: 'left',
              }}
            >
              {m.mission_id} — {m.start_time?.slice(0, 19).replace('T', ' ')}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>Speed:</span>
            {[0.5, 1, 2, 4, 8].map(s => (
              <button
                key={s}
                onClick={() => { setReplaySpeed(s); useTelemetryStore.getState().setReplaySpeed(s) }}
                style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                  background: replaySpeed === s ? '#38bdf8' : '#1e293b', color: '#fff', border: 'none',
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'whatif' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '6px 10px', background: '#a78bfa18', border: '1px solid #a78bfa40', borderRadius: 6, fontSize: 11, color: '#a78bfa' }}>
            SIMULATED PREVIEW — NOT LIVE DATA
          </div>
          <select
            value={whatifPreset}
            onChange={e => setWhatifPreset(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12 }}
          >
            <option value="high_altitude">High Altitude</option>
            <option value="endurance">Endurance Flight</option>
            <option value="hot_weather">Hot Weather</option>
            <option value="rapid_throttle">Rapid Throttle</option>
          </select>
          <button
            onClick={runWhatIf}
            disabled={loadingWhatif}
            style={{ padding: '8px', borderRadius: 8, background: '#a78bfa', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          >
            {loadingWhatif ? 'Simulating…' : 'Execute Simulation'}
          </button>
        </div>
      )}
    </div>
  )
}
