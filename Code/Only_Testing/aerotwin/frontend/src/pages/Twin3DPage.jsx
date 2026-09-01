// Twin3DPage.jsx — Glassmorphism 3D Twin & 6 Sub-Systems Health Matrix
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
  const { sensors, severity, healthIndex } = useTelemetryStore()
  const [selectedPart, setSelectedPart] = useState(ENGINE_PARTS[1])
  const [activeTab, setActiveTab] = useState('twin')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, height: '100%', overflow: 'hidden' }}>
      {/* Header Tab Switcher */}
      <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('twin')}
            style={{
              padding: '8px 18px', borderRadius: 9999, border: 'none',
              background: activeTab === 'twin' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'twin' ? '#fff' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: activeTab === 'twin' ? '0 4px 14px rgba(56, 189, 248, 0.3)' : 'none',
            }}
          >
            3D Digital Twin Viewer
          </button>
          <button
            onClick={() => setActiveTab('subsystems')}
            style={{
              padding: '8px 18px', borderRadius: 9999, border: 'none',
              background: activeTab === 'subsystems' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'subsystems' ? '#fff' : '#94a3b8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: activeTab === 'subsystems' ? '0 4px 14px rgba(56, 189, 248, 0.3)' : 'none',
            }}
          >
            6 Engine Sub-Systems Health Matrix
          </button>
        </div>

        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Engine Health: <span style={{ fontWeight: 800, color: healthIndex > 0.75 ? '#22c55e' : '#f59e0b' }}>{(healthIndex * 100).toFixed(0)}% ({severity.toUpperCase()})</span>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'twin' ? (
          <div className="responsive-grid-3d" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, height: '100%', overflow: 'hidden' }}>
            {/* 3D CANVAS VIEWPORT */}
            <div className="glass-panel" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#070b14' }}>
              <Suspense fallback={<div style={{ padding: 20, color: '#38bdf8' }}>Loading 3D Twin...</div>}>
                <EngineScene />
              </Suspense>

              {/* HUD Header */}
              <div style={{
                position: 'absolute', top: 16, left: 16, zIndex: 10,
                background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: '10px 18px',
                display: 'flex', alignItems: 'center', gap: 18,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>SPEED</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {sensors?.rpm != null ? sensors.rpm.toFixed(0) : '—'} <span style={{ fontSize: 10, color: '#64748b' }}>RPM</span>
                  </div>
                </div>
                <div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.1)' }} />
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>CHT TEMP</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                    {sensors?.cht != null ? sensors.cht.toFixed(1) : '—'} <span style={{ fontSize: 10, color: '#64748b' }}>°C</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT INSPECTION PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              <div className="glass-panel" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 14 }}>
                  Component Inspection
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ENGINE_PARTS.map(part => (
                    <button
                      key={part.id}
                      onClick={() => setSelectedPart(part)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                        background: selectedPart.id === part.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${selectedPart.id === part.id ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.04)'}`,
                        color: selectedPart.id === part.id ? '#38bdf8' : '#94a3b8',
                        fontSize: 12, fontWeight: selectedPart.id === part.id ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {part.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: 8 }}>
                  Part Specification
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  {selectedPart.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                  Material: {selectedPart.mat}
                </div>
                <div style={{ padding: 10, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 10, fontSize: 12, color: '#22c55e', fontWeight: 700, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
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
