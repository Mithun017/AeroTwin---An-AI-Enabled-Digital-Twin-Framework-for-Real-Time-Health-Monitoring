import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function C18DigitalTwin() {
  const canvasRef = useRef(null)
  const [status, setStatus] = useState({ loading: true, progress: 0, error: null })
  const [stats, setStats] = useState({ parts: 0, triangles: 0 })

  useEffect(() => {
    let active = true
    let animationId = null
    let renderer, controls, scene, camera

    const init = async () => {
      try {
        // Import Three.js modules - try both paths
        let OrbitControls, GLTFLoader

        try {
          const [controlsModule, loaderModule] = await Promise.all([
            import('three/addons/controls/OrbitControls.js'),
            import('three/addons/loaders/GLTFLoader.js')
          ])
          OrbitControls = controlsModule.OrbitControls
          GLTFLoader = loaderModule.GLTFLoader
          console.log('✅ Using three/addons/ path')
        } catch (e) {
          const [controlsModule, loaderModule] = await Promise.all([
            import('three/examples/jsm/controls/OrbitControls.js'),
            import('three/examples/jsm/loaders/GLTFLoader.js')
          ])
          OrbitControls = controlsModule.OrbitControls
          GLTFLoader = loaderModule.GLTFLoader
          console.log('✅ Using three/examples/jsm/ path')
        }

        if (!active) return

        const canvas = canvasRef.current
        const width = canvas.clientWidth
        const height = canvas.clientHeight

        // Scene
        scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0a0f)
        scene.fog = new THREE.Fog(0x0a0a0f, 2000, 8000)

        // Camera
        camera = new THREE.PerspectiveCamera(40, width / height, 1, 100000)
        camera.position.set(2600, 1900, 2800)

        // Renderer
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          powerPreference: 'high-performance'
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(width, height)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFShadowMap
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.0
        renderer.outputColorSpace = THREE.SRGBColorSpace

        // Controls
        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.screenSpacePanning = true
        controls.zoomToCursor = true

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        scene.add(ambientLight)

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
        mainLight.position.set(5000, 8000, 3000)
        mainLight.castShadow = true
        mainLight.shadow.mapSize.width = 2048
        mainLight.shadow.mapSize.height = 2048
        mainLight.shadow.camera.near = 100
        mainLight.shadow.camera.far = 20000
        mainLight.shadow.camera.left = -5000
        mainLight.shadow.camera.right = 5000
        mainLight.shadow.camera.top = 5000
        mainLight.shadow.camera.bottom = -5000
        scene.add(mainLight)

        const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.8)
        fillLight.position.set(-3000, -2000, -2000)
        scene.add(fillLight)

        const backLight = new THREE.DirectionalLight(0xffd700, 0.6)
        backLight.position.set(0, 3000, -5000)
        scene.add(backLight)

        // Hemisphere light for better ambient
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2c3e50, 0.4)
        scene.add(hemiLight)

        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(20000, 20000)
        const groundMaterial = new THREE.MeshStandardMaterial({
          color: 0x0f1419,
          roughness: 0.8,
          metalness: 0.2
        })
        const ground = new THREE.Mesh(groundGeometry, groundMaterial)
        ground.rotation.x = -Math.PI / 2
        ground.position.y = -100
        ground.receiveShadow = true
        scene.add(ground)

        // Grid helper
        const gridHelper = new THREE.GridHelper(10000, 50, 0x1e3a5f, 0x0a1929)
        gridHelper.position.y = -99
        scene.add(gridHelper)

        // Load Model - try complete model first, then zones
        const loader = new GLTFLoader()

        console.log('🔄 Loading C18 Complete Engine Model...')

        const modelPaths = [
          '/models/c18_complete.glb',  // Complete engine
          '/models/zone1.glb'           // Fallback to zone model
        ]

        let modelLoaded = false

        for (const modelPath of modelPaths) {
          if (modelLoaded || !active) break

          try {
            await new Promise((resolve, reject) => {
              loader.load(
                modelPath,
                (gltf) => {
                  if (!active) return

                  console.log(`✅ Successfully loaded: ${modelPath}`)
                  const model = gltf.scene

                  // Count parts and triangles
                  let partCount = 0
                  let triangleCount = 0

                  model.traverse((node) => {
                    if (node.isMesh) {
                      partCount++
                      node.castShadow = true
                      node.receiveShadow = true

                      if (node.geometry) {
                        triangleCount += node.geometry.index ?
                          node.geometry.index.count / 3 :
                          node.geometry.attributes.position.count / 3
                      }

                      // Enhance materials
                      if (node.material) {
                        node.material.needsUpdate = true
                        if (node.material.metalness !== undefined) {
                          node.material.metalness = Math.max(node.material.metalness, 0.6)
                        }
                        if (node.material.roughness !== undefined) {
                          node.material.roughness = Math.min(node.material.roughness, 0.5)
                        }
                      }
                    }
                  })

                  // Center model
                  const box = new THREE.Box3().setFromObject(model)
                  const center = box.getCenter(new THREE.Vector3())
                  const size = box.getSize(new THREE.Vector3())

                  model.position.sub(center)
                  model.position.y += size.y / 2 - 100 // Lift above ground

                  scene.add(model)

                  // Update camera to fit model
                  const maxDim = Math.max(size.x, size.y, size.z)
                  const fov = camera.fov * (Math.PI / 180)
                  const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.5

                  camera.position.set(
                    cameraDistance * 0.5,
                    cameraDistance * 0.4,
                    cameraDistance * 0.7
                  )
                  camera.lookAt(0, size.y / 4, 0)
                  controls.target.set(0, size.y / 4, 0)
                  controls.update()

                  setStats({ parts: partCount, triangles: Math.round(triangleCount) })
                  setStatus({ loading: false, progress: 100, error: null })
                  modelLoaded = true

                  resolve()
                },
                (xhr) => {
                  if (xhr.lengthComputable) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100)
                    setStatus(prev => ({ ...prev, progress: percent }))
                  }
                },
                (error) => {
                  console.warn(`Failed to load ${modelPath}:`, error.message)
                  reject(error)
                }
              )
            })
          } catch (err) {
            console.warn(`Skipping ${modelPath}`)
            continue
          }
        }

        if (!modelLoaded) {
          throw new Error('No model could be loaded')
        }

        // Animation loop
        const clock = new THREE.Clock()
        const animate = () => {
          if (!active) return
          animationId = requestAnimationFrame(animate)

          const delta = clock.getDelta()
          if (controls) controls.update()

          renderer.render(scene, camera)
        }
        animate()

        // Resize handler
        const handleResize = () => {
          if (!canvas) return
          const w = canvas.clientWidth
          const h = canvas.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
        window.addEventListener('resize', handleResize)

        return () => {
          window.removeEventListener('resize', handleResize)
        }

      } catch (err) {
        console.error('❌ Initialization error:', err)
        setStatus({ loading: false, progress: 0, error: err.message })
      }
    }

    init()

    return () => {
      active = false
      if (animationId) cancelAnimationFrame(animationId)
      if (controls) controls.dispose()
      if (renderer) renderer.dispose()
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a0a0f' }}>
      {/* Loading Overlay */}
      {status.loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          gap: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#06b6d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Loading Aero Engine Model
          </div>
          <div style={{
            width: '400px',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${status.progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #06b6d4, #10b981)',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)'
            }} />
          </div>
          <div style={{
            color: '#06b6d4',
            fontSize: '1.2rem',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}>
            {status.progress}%
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
            Loading complete engine assembly (~118 MB)
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {status.error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.95)',
          zIndex: 1000,
          gap: '20px',
          padding: '40px'
        }}>
          <div style={{ fontSize: '4rem' }}>⚠️</div>
          <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Failed to Load Model
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem', textAlign: 'center', maxWidth: '600px' }}>
            {status.error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Panel */}
      {!status.loading && !status.error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          color: 'white',
          zIndex: 100,
          minWidth: '250px'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#06b6d4' }}>
            Aero Piston Engine
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Parts:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{stats.parts.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Triangles:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{stats.triangles.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls Help */}
      {!status.loading && !status.error && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '0.85rem',
          zIndex: 100
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>Controls:</div>
          <div>🖱️ Left Click + Drag: Rotate</div>
          <div>🖱️ Right Click + Drag: Pan</div>
          <div>⚙️ Scroll: Zoom</div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: status.loading || status.error ? 'wait' : 'grab'
        }}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
