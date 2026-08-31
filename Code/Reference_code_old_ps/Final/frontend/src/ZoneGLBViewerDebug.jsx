import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Test component to diagnose the GLB loading issue
export default function ZoneGLBViewerDebug({ zoneId, height = 150 }) {
  const mountRef = useRef(null)
  const [status, setStatus] = useState('Initializing...')
  const [logs, setLogs] = useState([])

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { time: timestamp, msg, type }])
    console.log(`[${timestamp}] ${msg}`)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) {
      addLog('Mount ref is null', 'error')
      return
    }

    addLog('Starting component initialization', 'success')

    // Test 1: Check THREE.js
    addLog(`THREE.js version: ${THREE.REVISION}`, 'info')

    // Test 2: Try to import GLTFLoader
    let GLTFLoader
    let OrbitControls

    Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js')
        .then(module => {
          GLTFLoader = module.GLTFLoader
          addLog('✅ GLTFLoader imported successfully from examples/jsm', 'success')
        })
        .catch(err => {
          addLog(`❌ Failed to import GLTFLoader from examples/jsm: ${err.message}`, 'error')
          // Try alternative path
          return import('three/addons/loaders/GLTFLoader.js')
            .then(module => {
              GLTFLoader = module.GLTFLoader
              addLog('✅ GLTFLoader imported successfully from addons', 'success')
            })
        }),
      import('three/examples/jsm/controls/OrbitControls.js')
        .then(module => {
          OrbitControls = module.OrbitControls
          addLog('✅ OrbitControls imported successfully from examples/jsm', 'success')
        })
        .catch(err => {
          addLog(`❌ Failed to import OrbitControls from examples/jsm: ${err.message}`, 'error')
          // Try alternative path
          return import('three/addons/controls/OrbitControls.js')
            .then(module => {
              OrbitControls = module.OrbitControls
              addLog('✅ OrbitControls imported successfully from addons', 'success')
            })
        })
    ]).then(() => {
      if (!GLTFLoader) {
        addLog('❌ GLTFLoader could not be loaded from any path', 'error')
        setStatus('Failed: GLTFLoader not available')
        return
      }

      // Test 3: Create scene
      addLog('Creating THREE.js scene...', 'info')
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / height, 0.1, 100)
      camera.position.set(0, 0, 8)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(mount.clientWidth, height)
      mount.appendChild(renderer.domElement)
      addLog('✅ Scene, camera, and renderer created', 'success')

      // Test 4: Try to load GLB file
      const modelUrl = `/models/zone${zoneId}.glb`
      addLog(`Attempting to load: ${modelUrl}`, 'info')

      // First, test if file is accessible
      fetch(modelUrl, { method: 'HEAD' })
        .then(response => {
          addLog(`File HEAD response: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error')
          addLog(`Content-Type: ${response.headers.get('Content-Type')}`, 'info')
          addLog(`Content-Length: ${response.headers.get('Content-Length')} bytes`, 'info')

          if (!response.ok) {
            setStatus(`Failed: HTTP ${response.status}`)
            return
          }

          // Now try to load with GLTFLoader
          const loader = new GLTFLoader()
          addLog('GLTFLoader instance created, starting load...', 'info')

          loader.load(
            modelUrl,
            (gltf) => {
              addLog('✅✅✅ MODEL LOADED SUCCESSFULLY! ✅✅✅', 'success')
              addLog(`Model has ${gltf.scene.children.length} root objects`, 'info')
              setStatus('✅ Success! Model loaded')

              // Add model to scene
              scene.add(gltf.scene)

              // Simple animation
              const animate = () => {
                requestAnimationFrame(animate)
                gltf.scene.rotation.y += 0.01
                renderer.render(scene, camera)
              }
              animate()
            },
            (xhr) => {
              const percent = Math.round((xhr.loaded / xhr.total) * 100)
              addLog(`Loading progress: ${percent}%`, 'info')
              setStatus(`Loading: ${percent}%`)
            },
            (error) => {
              addLog(`❌❌❌ LOAD ERROR: ${error.message}`, 'error')
              addLog(`Error type: ${error.constructor.name}`, 'error')
              addLog(`Full error: ${JSON.stringify(error, null, 2)}`, 'error')
              setStatus(`Failed: ${error.message}`)
            }
          )
        })
        .catch(err => {
          addLog(`❌ Fetch failed: ${err.message}`, 'error')
          setStatus(`Failed: Cannot access file`)
        })
    }).catch(err => {
      addLog(`❌ Module import failed: ${err.message}`, 'error')
      setStatus(`Failed: Module import error`)
    })

  }, [zoneId, height])

  return (
    <div style={{ width: '100%', minHeight: height, background: '#0a0a0f', borderRadius: '8px', padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--accent-cyan)', margin: '0 0 8px 0', fontSize: '1.1rem' }}>
          🔍 GLB Loader Diagnostic (Zone {zoneId})
        </h3>
        <div style={{
          padding: '8px 12px',
          background: status.includes('Success') ? 'rgba(16, 185, 129, 0.1)' : status.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.1)',
          border: `1px solid ${status.includes('Success') ? 'var(--accent-emerald)' : status.includes('Failed') ? 'var(--accent-red)' : 'var(--accent-cyan)'}`,
          borderRadius: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: status.includes('Success') ? 'var(--accent-emerald)' : status.includes('Failed') ? 'var(--accent-red)' : 'var(--accent-cyan)'
        }}>
          {status}
        </div>
      </div>

      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        padding: '12px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem'
      }}>
        {logs.map((log, i) => (
          <div key={i} style={{
            marginBottom: '6px',
            paddingLeft: '8px',
            borderLeft: `2px solid ${log.type === 'success' ? 'var(--accent-emerald)' : log.type === 'error' ? 'var(--accent-red)' : 'var(--text-secondary)'}`,
            color: log.type === 'success' ? 'var(--accent-emerald)' : log.type === 'error' ? 'var(--accent-red)' : 'var(--text-secondary)'
          }}>
            <span style={{ opacity: 0.5 }}>[{log.time}]</span> {log.msg}
          </div>
        ))}
      </div>

      <div ref={mountRef} style={{ marginTop: '16px', width: '100%', height, background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }} />
    </div>
  )
}
