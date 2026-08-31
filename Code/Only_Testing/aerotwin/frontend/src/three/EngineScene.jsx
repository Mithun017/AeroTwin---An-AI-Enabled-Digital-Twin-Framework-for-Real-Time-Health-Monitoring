// EngineScene.jsx — React Three Fiber canvas scene with Studio Lighting
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import EngineModel from './EngineModel'
import { useTelemetryStore } from '../state/telemetryStore'

export default function EngineScene() {
  const { mode, severity } = useTelemetryStore()
  const isSim = mode === 'whatif'

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0a0f1d' }}>
      {/* Mode banner */}
      {isSim && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, background: '#a78bfa25', border: '1px solid #a78bfa80',
          borderRadius: 6, padding: '4px 14px', fontSize: 11, color: '#c4b5fd', fontWeight: 700,
          boxShadow: '0 0 12px #a78bfa40',
        }}>
          SIMULATED PREVIEW — NOT LIVE DATA
        </div>
      )}

      {/* Severity badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        background: '#0f172acc', border: '1px solid #334155',
        backdropFilter: 'blur(8px)',
        borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#38bdf8',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}>
        3D Twin · {severity?.toUpperCase() || 'NORMAL'}
      </div>

      <Canvas camera={{ position: [0, 2.5, 7.5], fov: 48 }} shadows gl={{ antialias: true, alpha: false }}>
        {/* Deep dark backdrop with subtle blue fog */}
        <color attach="background" args={['#0a0f1d']} />
        <fog attach="fog" args={['#0a0f1d', 10, 24]} />

        {/* 100% Offline Studio Lighting Setup (no external HDRI network dependency) */}
        <ambientLight intensity={0.9} />
        <hemisphereLight skyColor="#38bdf8" groundColor="#0f172a" intensity={0.8} />
        
        {/* Key Light */}
        <directionalLight position={[6, 10, 6]} intensity={2.0} castShadow shadow-mapSize={[1024, 1024]} />
        {/* Blue Fill Light */}
        <directionalLight position={[-6, 5, -4]} intensity={1.2} color="#38bdf8" />
        {/* Warm Back/Rim Light */}
        <directionalLight position={[0, -4, 4]} intensity={0.8} color="#f59e0b" />
        {/* Top Metallic Specular Light */}
        <pointLight position={[0, 5, 2]} intensity={2.5} color="#ffffff" distance={10} />

        {/* Grid Floor */}
        <Grid
          args={[24, 24]}
          position={[0, -1.3, 0]}
          cellColor="#1e293b"
          sectionColor="#3b82f6"
          cellThickness={0.5}
          sectionThickness={1.2}
          fadeDistance={18}
          infiniteGrid
        />

        {/* 3D Engine Model */}
        <EngineModel />

        {/* Camera Controls */}
        <OrbitControls
          enablePan={false}
          minDistance={3.5}
          maxDistance={12}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.85}
          autoRotate={severity === 'normal'}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
}
