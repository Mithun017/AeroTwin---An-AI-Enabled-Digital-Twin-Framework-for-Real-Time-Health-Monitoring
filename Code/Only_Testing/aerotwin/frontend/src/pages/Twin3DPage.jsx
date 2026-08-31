// Twin3DPage.jsx — 3D Twin Viewer & 6 Sub-Systems Health Matrix
import { useState, Suspense } from 'react'
import EngineScene from '../three/EngineScene'
import SubsystemsPage from './SubsystemsPage'
import { useTelemetryStore } from '../state/telemetryStore'

const ENGINE_PARTS = [
  { id: 'block',     name: 'Billet Aluminum Crankcase', mat: 'Billet Slate Silver', status: 'Optimal (2.1 bar)' },
  { id: 'cylinders', name: '4-Cylinder Heat Sleeves',   mat: 'Thermal Anodized Aluminum', status: 'Live Heat Monitoring' },
  { id: 'heads',     name: 'Cobalt Racing Cylinder Caps',mat: 'High-Temp Anodized Blue', status: 'CHT Nominal' },
  { id: 'intake',    name: 'Anodized Gold Plenum',      mat: 'Gold Aluminum Alloy', status: 'Flow 11.4 L/hr' },
  { id: 'exhaust',   name: 'Titanium Exhaust Headers',  mat: 'Heat-Blued Titanium', status: 'EGT Active' },
  { id: 'fuel_rail', name: 'Magenta Fuel Rail & Injectors', mat: 'Billet Rail + Brass Injectors', status: 'Injection Timed' },
]

export default function Twin3DPage() {
  const { sensors, mlOutput, severity, healthIndex } = useTelemetryStore()
  const [selectedPart, setSelectedPart] = useState(ENGINE_PARTS[1])
  const [activeTab, setActiveTab] = useState('twin') // 'twin' | 'subsystems'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, height: '100%', overflow: 'hidden' }}>
      {/* View Switcher Header Tab */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('twin')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: activeTab === 'twin' ? '#38bdf8' : '#1e293b',
              color: activeTab === 'twin' ? '#0f172a' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            3D Digital Twin Viewer
          </button>
          <button
            onClick={() => setActiveTab('subsystems')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: activeTab === 'subsystems' ? '#38bdf8' : '#1e293b',
              color: activeTab === 'subsystems' ? '#0f172a' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            6 Engine Sub-Systems Health Matrix
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#64748b' }}>
          Engine Health: <span style={{ fontWeight: 700, color: healthIndex > 0.75 ? '#22c55e' : '#f59e0b' }}>{(healthIndex * 100).toFixed(0)}% ({severity.toUpperCase()})</span>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'twin' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, height: '100%', overflow: 'hidden' }}>
            {/* 3D CANVAS VIEWPORT */}
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b', background: '#090d16' }}>
              <Suspense fallback={<div style={{ padding: 20, color: '#38bdf8' }}>Loading 3D Twin...</div>}>
                <EngineScene />
              </Suspense>

              {/* HUD Header */}
              <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 10,
                background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
                border: '1px solid #334155', borderRadius: 10, padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>SPEED</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {sensors?.rpm != null ? sensors.rpm.toFixed(0) : '—'} <span style={{ fontSize: 10, color: '#64748b' }}>RPM</span>
                  </div>
                </div>
                <div style={{ width: 1, height: 24, background: '#334155' }} />
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>CHT TEMP</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                    {sensors?.cht != null ? sensors.cht.toFixed(1) : '—'} <span style={{ fontSize: 10, color: '#64748b' }}>°C</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT INSPECTION PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
                  Component Inspection
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ENGINE_PARTS.map(part => (
                    <button
                      key={part.id}
                      onClick={() => setSelectedPart(part)}
                      style={{
                        padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                        background: selectedPart.id === part.id ? '#1e293b' : 'transparent',
                        border: `1px solid ${selectedPart.id === part.id ? '#38bdf8' : '#1e293b'}`,
                        color: selectedPart.id === part.id ? '#38bdf8' : '#94a3b8',
                        fontSize: 12, fontWeight: selectedPart.id === part.id ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {part.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: 8 }}>
                  Part Specification
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  {selectedPart.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                  Material: {selectedPart.mat}
                </div>
                <div style={{ padding: 8, background: '#1e293b', borderRadius: 6, fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                  Status: {selectedPart.status}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SubsystemsPage />
        )}
      </div>
    </div>
  )
}
