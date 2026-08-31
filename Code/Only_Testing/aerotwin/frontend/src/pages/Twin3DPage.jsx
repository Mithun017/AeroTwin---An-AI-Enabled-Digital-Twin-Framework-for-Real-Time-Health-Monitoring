// Twin3DPage.jsx — Fullscreen 3D Digital Twin Viewer & Inspection Tool
import { useState, Suspense } from 'react'
import EngineScene from '../three/EngineScene'
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
  const { sensors, residual, mlOutput, severity, healthIndex } = useTelemetryStore()
  const [selectedPart, setSelectedPart] = useState(ENGINE_PARTS[1])
  const [showHeatMap, setShowHeatMap] = useState(true)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, padding: 12, height: '100%', overflow: 'hidden' }}>
      {/* 3D CANVAS VIEWPORT */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b', background: '#090d16' }}>
        <Suspense fallback={<div style={{ padding: 20, color: '#38bdf8' }}>Loading 3D Twin...</div>}>
          <EngineScene />
        </Suspense>

        {/* Live Overlay HUD Header */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 10,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid #334155', borderRadius: 10, padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>ENGINE SPEED</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
              {sensors?.rpm != null ? sensors.rpm.toFixed(0) : '—'} <span style={{ fontSize: 11, color: '#64748b' }}>RPM</span>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: '#334155' }} />
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>CYLINDER TEMP</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
              {sensors?.cht != null ? sensors.cht.toFixed(1) : '—'} <span style={{ fontSize: 11, color: '#64748b' }}>°C</span>
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: '#334155' }} />
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>HEALTH STATE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: healthIndex > 0.75 ? '#22c55e' : '#f59e0b', textTransform: 'uppercase' }}>
              {(healthIndex * 100).toFixed(0)}% · {severity}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT INSPECTION & CAMERA CONTROLS PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        {/* Component Selector */}
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

        {/* Selected Part Details Card */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: 8 }}>
            Part Specification
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
            {selectedPart.name}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
            Material: {selectedPart.mat}
          </div>
          <div style={{ padding: 10, background: '#1e293b', borderRadius: 8, fontSize: 12, color: '#cbd5e1' }}>
            Status: <span style={{ fontWeight: 700, color: '#22c55e' }}>{selectedPart.status}</span>
          </div>
        </div>

        {/* Diagnostics & Residual Attribution */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
            XAI Residual Attribution
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
            Top residual drivers impacting 3D visual state:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {mlOutput?.top_contributors?.map(c => (
              <span key={c} style={{ padding: '4px 8px', borderRadius: 6, background: '#38bdf818', color: '#38bdf8', border: '1px solid #38bdf840', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
