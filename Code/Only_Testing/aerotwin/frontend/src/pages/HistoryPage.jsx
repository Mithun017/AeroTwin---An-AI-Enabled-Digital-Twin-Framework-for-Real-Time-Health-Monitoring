// HistoryPage.jsx — Mission Logs, Playback Scrubber & SAE J1939 CAN Monitor
import { useState, useEffect } from 'react'
import { useTelemetryStore } from '../state/telemetryStore'
import CANBusPage from './CANBusPage'
import { RefreshIcon, PlayIcon } from '../components/Icons'

export default function HistoryPage() {
  const { setMode, setReplayTicks, setReplaySpeed, replaySpeed } = useTelemetryStore()
  const [activeTab, setActiveTab] = useState('replay') // 'replay' | 'canbus'
  const [missions, setMissions] = useState([])
  const [selectedMission, setSelectedMission] = useState(null)
  const [ticks, setTicks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMissions()
  }, [])

  async function fetchMissions() {
    try {
      const res = await fetch('http://localhost:8000/missions')
      const data = await res.json()
      setMissions(data || [])
    } catch (e) {
      console.error('Failed to fetch missions:', e)
    }
  }

  async function loadMissionDetails(id) {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8000/missions/${id}/ticks?limit=2000`)
      const data = await res.json()
      setTicks(data || [])
      setSelectedMission(id)
    } finally {
      setLoading(false)
    }
  }

  function startReplay() {
    if (ticks.length > 0) {
      setReplayTicks(ticks)
      setMode('replay')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, height: '100%', overflow: 'hidden' }}>
      {/* Header Tab Switcher */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('replay')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: activeTab === 'replay' ? '#38bdf8' : '#1e293b',
              color: activeTab === 'replay' ? '#0f172a' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            Mission Logs & Playback Scrubber
          </button>
          <button
            onClick={() => setActiveTab('canbus')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: activeTab === 'canbus' ? '#38bdf8' : '#1e293b',
              color: activeTab === 'canbus' ? '#0f172a' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            SAE J1939 CAN Bus Protocol Stream
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#64748b' }}>
          Stored Missions: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{missions.length}</span>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'replay' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12, height: '100%', overflow: 'hidden' }}>
            {/* LEFT: MISSION LOGS LIST */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>
                  Mission Logs
                </span>
                <button onClick={fetchMissions} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshIcon size={12} color="#38bdf8" /> Refresh
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {missions.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic', textAlign: 'center', paddingTop: 20 }}>
                    No stored mission logs found.
                  </div>
                ) : (
                  missions.map(m => (
                    <div
                      key={m.mission_id}
                      onClick={() => loadMissionDetails(m.mission_id)}
                      style={{
                        padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                        background: selectedMission === m.mission_id ? '#1e293b' : '#090d16',
                        border: `1px solid ${selectedMission === m.mission_id ? '#38bdf8' : '#1e293b'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
                        {m.mission_id}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                        {m.start_time?.replace('T', ' ').slice(0, 19)}
                      </div>
                      <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 6, fontWeight: 600 }}>
                        Scenario: {m.scenario || 'Live Flight'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: SELECTED MISSION REPLAY & TICK LOG TABLE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedMission ? `Mission: ${selectedMission}` : 'Select a Mission Log'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {ticks.length} total telemetry ticks stored
                  </div>
                </div>

                {selectedMission && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Speed:</span>
                      {[0.5, 1, 2, 4, 8].map(s => (
                        <button
                          key={s}
                          onClick={() => setReplaySpeed(s)}
                          style={{
                            padding: '4px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                            background: replaySpeed === s ? '#38bdf8' : '#1e293b', color: '#fff', border: 'none',
                          }}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={startReplay}
                      style={{
                        padding: '8px 16px', borderRadius: 8, background: '#38bdf8', border: 'none',
                        color: '#0f172a', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <PlayIcon size={12} color="#0f172a" /> Start Playback
                    </button>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, overflow: 'auto' }}>
                {loading ? (
                  <div style={{ color: '#38bdf8', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>Loading tick sequence...</div>
                ) : ticks.length === 0 ? (
                  <div style={{ color: '#475569', fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingTop: 40 }}>
                    Select a mission log from the left panel to inspect tick telemetry.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#94a3b8', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b' }}>
                        <th style={{ padding: 8 }}>TIMESTAMP</th>
                        <th style={{ padding: 8 }}>RPM</th>
                        <th style={{ padding: 8 }}>CHT (°C)</th>
                        <th style={{ padding: 8 }}>EGT (°C)</th>
                        <th style={{ padding: 8 }}>OIL P (bar)</th>
                        <th style={{ padding: 8 }}>HEALTH INDEX</th>
                        <th style={{ padding: 8 }}>FAULT CLASS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticks.slice(0, 100).map((t, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e293b20', fontFamily: 'JetBrains Mono, monospace' }}>
                          <td style={{ padding: 8, color: '#f8fafc' }}>{t.timestamp?.slice(11, 23)}</td>
                          <td style={{ padding: 8 }}>{t.sensors?.rpm?.toFixed(0)}</td>
                          <td style={{ padding: 8 }}>{t.sensors?.cht?.toFixed(1)}</td>
                          <td style={{ padding: 8 }}>{t.sensors?.egt?.toFixed(1)}</td>
                          <td style={{ padding: 8 }}>{t.sensors?.oil_pressure?.toFixed(2)}</td>
                          <td style={{ padding: 8, color: t.health_index > 0.75 ? '#22c55e' : '#ef4444' }}>
                            {(t.health_index * 100).toFixed(0)}%
                          </td>
                          <td style={{ padding: 8, color: '#38bdf8' }}>{t.ml_output?.fault_class || 'none'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          <CANBusPage />
        )}
      </div>
    </div>
  )
}
