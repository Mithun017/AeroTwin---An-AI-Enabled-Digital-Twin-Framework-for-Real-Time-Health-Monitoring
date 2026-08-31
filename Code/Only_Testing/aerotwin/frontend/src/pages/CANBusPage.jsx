// CANBusPage.jsx — J1939 CAN Bus Protocol Monitor & Signal Integrity
import { useState, useEffect } from 'react'

export default function CANBusPage() {
  const [canData, setCanData] = useState(null)

  useEffect(() => {
    const interval = setInterval(fetchCAN, 1000)
    fetchCAN()
    return () => clearInterval(interval)
  }, [])

  async function fetchCAN() {
    try {
      const res = await fetch('http://localhost:8000/api/canbus/stream')
      const data = await res.json()
      setCanData(data)
    } catch (e) {
      console.error('CAN Bus fetch error:', e)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 12, padding: 12, height: '100%', overflowY: 'auto' }}>
      {/* Header Info Banner */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>J1939 CAN Bus Protocol Monitor</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>High-Speed Heavy-Duty Vehicle Engine Network (SAE J1939 / 250 kbps)</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Baudrate: 250 kbps</span>
          <span style={{ padding: '4px 10px', borderRadius: 6, background: '#22c55e20', color: '#22c55e', fontSize: 11, fontWeight: 700 }}>
            {canData?.can_bus_state || 'ACTIVE_NORMAL'}
          </span>
        </div>
      </div>

      {/* PGN Stream Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {canData?.pgns?.map(pgn => (
          <div key={pgn.pgn} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
              PGN {pgn.pgn}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 2, marginBottom: 12 }}>
              {pgn.label}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pgn.spns.map(spn => (
                <div key={spn.spn} style={{ padding: 10, background: '#1e293b', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>SPN {spn.spn} — {spn.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                      {spn.value} <span style={{ fontSize: 10, color: '#64748b' }}>{spn.unit}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', padding: '2px 6px', background: '#22c55e18', borderRadius: 4 }}>
                    {spn.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
