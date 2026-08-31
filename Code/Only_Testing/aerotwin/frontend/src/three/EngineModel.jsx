// EngineModel.jsx — High-fidelity Multi-color Procedural Aero Piston Engine
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTelemetryStore } from '../state/telemetryStore'
import { createHeatMaterial } from './materials/HeatShader'

const SEVERITY_COLORS = {
  normal: '#22c55e', low: '#84cc16', medium: '#f59e0b',
  high: '#ef4444', critical: '#dc2626',
}

export default function EngineModel() {
  const crankRef = useRef()
  const cylinderRefs = useRef([])
  const pistonRefs = useRef([])
  const haloRef = useRef()
  const heatMats = useRef([])

  const { sensors, residual, severity } = useTelemetryStore()

  // Create heat materials for 4 cylinders (memoised)
  useMemo(() => {
    heatMats.current = Array.from({ length: 4 }, () => createHeatMaterial('#0ea5e9'))
  }, [])

  useFrame((state, delta) => {
    const rpm = sensors?.rpm ?? 2400
    const chtRes = Math.abs(residual?.cht ?? 0) / 80
    const egtRes = Math.abs(residual?.egt ?? 0) / 120
    const vibRes = Math.abs(residual?.vibration ?? 0) / 1.0
    const heat = Math.min(1, (chtRes + egtRes) / 2)
    const t = state.clock.elapsedTime

    // Crankshaft rotation — speed proportional to RPM
    const crankAngle = (rpm / 60) * t * Math.PI * 2
    if (crankRef.current) {
      crankRef.current.rotation.x = crankAngle
    }

    // Update Heat Shader uniform for each cylinder
    heatMats.current.forEach(mat => {
      if (mat.uniforms) {
        mat.uniforms.uHeat.value += (heat - mat.uniforms.uHeat.value) * 0.08
      }
    })

    // Animate Pistons & Vibration Jitter per cylinder
    cylinderRefs.current.forEach((ref, i) => {
      if (!ref) return
      const phase = i * (Math.PI / 2)  // 4-stroke firing offset
      // Vibration jitter on engine block/cylinders
      const jitterX = vibRes * Math.sin(t * 50 + phase) * 0.05
      const jitterY = vibRes * Math.cos(t * 45 + phase) * 0.04
      ref.position.x = (i - 1.5) * 1.35 + jitterX
      ref.position.y = 0.65 + jitterY

      // Animated Piston motion inside cylinder
      const piston = pistonRefs.current[i]
      if (piston) {
        const pistonStroke = Math.sin(crankAngle + phase) * 0.35
        piston.position.y = pistonStroke
      }
    })

    // Halo glow pulse for critical/high severity
    if (haloRef.current) {
      const pulse = severity === 'critical' ? Math.sin(t * 10) * 0.5 + 0.5
                  : severity === 'high'     ? Math.sin(t * 5) * 0.3 + 0.7
                  : 0.2
      haloRef.current.intensity = pulse * 4
      haloRef.current.color.set(SEVERITY_COLORS[severity] || '#22c55e')
    }
  })

  const haloColor = SEVERITY_COLORS[severity] || '#22c55e'

  return (
    <group position={[0, -0.3, 0]}>
      {/* ── 1. ENGINE BLOCK & CRANKCASE (Billet Aluminum + Gold Accents) ── */}
      <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.8, 0.8, 2.2]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Crankcase side inspection covers (Anodized Gold) */}
      <mesh position={[0, -0.2, 1.12]} castShadow>
        <boxGeometry args={[5.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.2, -1.12]} castShadow>
        <boxGeometry args={[5.2, 0.5, 0.05]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ── 2. CYLINDER ASSEMBLIES (4 Cylinders) ── */}
      {[0, 1, 2, 3].map(i => (
        <group key={i} ref={el => (cylinderRefs.current[i] = el)} position={[(i - 1.5) * 1.35, 0.65, 0]}>
          
          {/* Main Cylinder Sleeve (Heat Shader) */}
          <mesh material={heatMats.current[i]} castShadow>
            <cylinderGeometry args={[0.42, 0.44, 1.3, 24]} />
          </mesh>

          {/* Polished Chrome Cooling Fins */}
          {[-0.4, -0.2, 0.0, 0.2, 0.4].map((y, fi) => (
            <mesh key={fi} position={[0, y, 0]} castShadow>
              <cylinderGeometry args={[0.56, 0.56, 0.05, 24]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
            </mesh>
          ))}

          {/* Anodized Cobalt Racing Cylinder Head Cap */}
          <mesh position={[0, 0.8, 0]} castShadow>
            <cylinderGeometry args={[0.46, 0.44, 0.35, 24]} />
            <meshStandardMaterial color="#1d4ed8" metalness={0.85} roughness={0.25} />
          </mesh>

          {/* Gold Head Bolts (4 per cylinder) */}
          {[
            [-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]
          ].map(([bx, bz], bi) => (
            <mesh key={bi} position={[bx, 0.98, bz]}>
              <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
            </mesh>
          ))}

          {/* Spark Plug (Ceramic + Polished Hex Base) */}
          <group position={[0.25, 0.98, 0]}>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.8} /> {/* Ceramic */}
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.15, 8]} />
              <meshStandardMaterial color="#38bdf8" metalness={0.9} roughness={0.1} /> {/* Terminal */}
            </mesh>
          </group>

          {/* Neon Ignition Cable (Connecting to Spark Plug) */}
          <mesh position={[0.25, 1.15, 0.3]} rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
            <meshStandardMaterial color="#84cc16" emissive="#84cc16" emissiveIntensity={0.3} />
          </mesh>

          {/* Inner Moving Piston Assembly */}
          <mesh ref={el => (pistonRefs.current[i] = el)} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.4, 20]} />
            <meshStandardMaterial color="#38bdf8" metalness={0.9} roughness={0.1} />
            {/* Piston Rings */}
            <mesh position={[0, 0.1, 0]}>
              <torusGeometry args={[0.385, 0.015, 8, 20]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.95} />
            </mesh>
          </mesh>
        </group>
      ))}

      {/* ── 3. HIGH-PERFORMANCE INTAKE MANIFOLD (Anodized Gold Aluminum) ── */}
      <group position={[0, 0.85, 0.85]}>
        {/* Main Plenum Bar */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 5.0, 20]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Individual Runner Pipes to Cylinders */}
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} position={[(i - 1.5) * 1.35, -0.2, -0.35]} rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.6, 16]} />
            <meshStandardMaterial color="#fb923c" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* ── 4. FUEL RAIL & INJECTORS (Anodized Magenta Rail + Brass Injectors) ── */}
      <group position={[0, 1.1, 0.6]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 5.0, 12]} />
          <meshStandardMaterial color="#ec4899" metalness={0.9} roughness={0.2} />
        </mesh>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} position={[(i - 1.5) * 1.35, -0.15, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 8]} />
            <meshStandardMaterial color="#eab308" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* ── 5. TITANIUM EXHAUST HEADERS (Titanium Blue-Purple Tint) ── */}
      <group position={[0, 0.35, -0.85]}>
        {[0, 1, 2, 3].map(i => (
          <group key={i} position={[(i - 1.5) * 1.35, 0, 0]}>
            <mesh rotation={[Math.PI / 3, 0, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.9, 16]} />
              <meshStandardMaterial
                color="#6366f1"
                metalness={0.85}
                roughness={0.3}
                emissive="#f97316"
                emissiveIntensity={0.15}
              />
            </mesh>
          </group>
        ))}
        {/* Exhaust Collector Pipe */}
        <mesh position={[0, -0.4, -0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 5.2, 20]} />
          <meshStandardMaterial color="#4f46e5" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 6. CRANKSHAFT & FLYWHEEL (Polished Steel + Brass Weights) ── */}
      <group ref={crankRef} position={[0, -0.45, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 5.6, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Flywheel / Pulley at End */}
        <mesh position={[2.85, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.25, 32]} />
          <meshStandardMaterial color="#38bdf8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Brass Counterweights */}
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} position={[(i - 1.5) * 1.35, 0, 0]} rotation={[0, 0, (i * Math.PI) / 2]}>
            <boxGeometry args={[0.12, 0.45, 0.35]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* ── 7. LIGHTING & GLOW EFFECTS ── */}
      <pointLight
        ref={haloRef}
        position={[0, 2.0, 0]}
        intensity={1}
        distance={7}
        color={haloColor}
      />
      {/* Cool cyan under-glow */}
      <pointLight position={[0, -1.2, 0]} intensity={1.5} color="#06b6d4" distance={5} />
      {/* Warm top accent light */}
      <pointLight position={[0, 3.5, 2]} intensity={2.0} color="#fef08a" distance={8} />
    </group>
  )
}
