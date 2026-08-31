import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function ZoneGLBViewer({ zoneId, height = 150 }) {
  const mountRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadProgress, setLoadProgress] = useState(0)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let active = true
    let loadingTimeout = null
    const scene = new THREE.Scene()

    // Camera
    const width = mount.clientWidth || 200
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 0, 8)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5)
    dirLight1.position.set(5, 10, 7)
    scene.add(dirLight1)

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.8) // subtle blue fill light
    dirLight2.position.set(-5, -5, -5)
    scene.add(dirLight2)

    // Point light to highlight the model center
    const pointLight = new THREE.PointLight(0xffb300, 1.5, 10)
    pointLight.position.set(0, 1, 2)
    scene.add(pointLight)

    // Loader
    const loader = new GLTFLoader()
    const modelUrl = `/models/zone${zoneId}.glb`

    let controls
    let animationFrameId
    let modelGroup = new THREE.Group()
    scene.add(modelGroup)

    // Set timeout for loading (30 seconds for large files)
    loadingTimeout = setTimeout(() => {
      if (active && loading) {
        console.warn(`Model loading timeout: zone${zoneId}.glb`)
        setError('Model loading timed out. File may be too large.')
        setLoading(false)
      }
    }, 30000)

    loader.load(
      modelUrl,
      (gltf) => {
        if (!active) return
        clearTimeout(loadingTimeout)

        const model = gltf.scene

        // Setup materials / shadows
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            // Make the metallic look premium
            if (node.material) {
              node.material.roughness = Math.min(node.material.roughness, 0.5);
              node.material.metalness = Math.max(node.material.metalness, 0.5);
            }
          }
        })

        // Center the model in the view
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())

        model.position.sub(center) // offset model center to (0,0,0)
        modelGroup.add(model)

        // Adjust camera position based on model size
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = camera.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        cameraZ *= 1.4 // zoom padding
        camera.position.set(cameraZ * 0.4, cameraZ * 0.4, cameraZ)
        camera.lookAt(new THREE.Vector3(0, 0, 0))

        // Orbit Controls
        try {
          controls = new OrbitControls(camera, renderer.domElement)
          controls.enableDamping = true
          controls.dampingFactor = 0.05
          controls.maxDistance = cameraZ * 3
          controls.minDistance = cameraZ * 0.3
          controls.target.set(0, 0, 0)
        } catch (e) {
          console.error("OrbitControls failed", e)
        }

        console.log(`✅ Successfully loaded zone${zoneId}.glb`)
        setLoading(false)
        setLoadProgress(100)
      },
      (xhr) => {
        // Progress callback
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100
          setLoadProgress(Math.round(percentComplete))
          console.log(`Loading zone${zoneId}.glb: ${Math.round(percentComplete)}%`)
        }
      },
      (err) => {
        if (!active) return
        clearTimeout(loadingTimeout)
        console.error(`❌ Error loading zone${zoneId}.glb:`, err)
        console.error('Full error:', err)
        setError(err.message || "Failed to load 3D model - see console for details")
        setLoading(false)
      }
    )

    // Animation Loop
    const clock = new THREE.Clock()
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      
      if (controls) {
        controls.update()
      } else {
        modelGroup.rotation.y = elapsed * 0.25
      }

      // Add a slow auto-rotation on top of user controls if not actively dragging
      if (controls && !controls.state === -1) {
        modelGroup.rotation.y += 0.003
      } else if (controls) {
        modelGroup.rotation.y += 0.003
      }
      
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      if (!mount) return
      const w = mount.clientWidth
      camera.aspect = w / height
      camera.updateProjectionMatrix()
      renderer.setSize(w, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      active = false
      clearTimeout(loadingTimeout)
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      if (controls) controls.dispose()
      renderer.dispose()
      if (mount && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [zoneId, height])

  return (
    <div style={{
      width: '100%',
      height,
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(245, 197, 24, 0.22) 0%, #030306 45%, #050508 70%, rgba(255, 255, 255, 0.15) 100%)',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid rgba(245, 197, 24, 0.25)',
      boxShadow: 'inset 0 0 20px rgba(245, 197, 24, 0.08), 0 4px 20px rgba(0, 0, 0, 0.4)'
    }}>
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.4)', gap: '8px', zIndex: 10
        }}>
          <div className="skeleton-spinner" style={{
            width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--accent-yellow)', animation: 'spin 0.8s linear infinite'
          }} />
          <div>Loading Aero Engine Model...</div>
          {loadProgress > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {loadProgress}% - Zone {zoneId}
            </div>
          )}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Large file (~{Math.round([17, 19, 28, 30, 23, 15][zoneId - 1] || 20)}MB)
          </div>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-red)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.6)', padding: '16px', textAlign: 'center', zIndex: 10
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontWeight: 'bold' }}>Failed to load model</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: '250px' }}>
            {error}
          </div>
          <div style={{
            marginTop: '8px',
            padding: '6px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--accent-red)',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)'
          }}>
            zone{zoneId}.glb
          </div>
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
