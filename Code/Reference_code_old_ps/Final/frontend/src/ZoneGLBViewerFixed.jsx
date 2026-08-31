import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function ZoneGLBViewerFixed({ zoneId, height = 150 }) {
  const mountRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadProgress, setLoadProgress] = useState(0)
  const loadersRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let active = true
    let loadingTimeout = null
    let animationFrameId = null
    let controls = null
    let renderer = null

    const cleanup = () => {
      active = false
      if (loadingTimeout) clearTimeout(loadingTimeout)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (controls) controls.dispose()
      if (renderer) {
        renderer.dispose()
        if (mount && mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement)
        }
      }
    }

    // Dynamically import loaders to handle both path scenarios
    const loadModules = async () => {
      try {
        // Try modern path first (r150+)
        try {
          const [gltfModule, controlsModule] = await Promise.all([
            import('three/addons/loaders/GLTFLoader.js'),
            import('three/addons/controls/OrbitControls.js')
          ])
          return { GLTFLoader: gltfModule.GLTFLoader, OrbitControls: controlsModule.OrbitControls }
        } catch (e) {
          // Fallback to legacy path
          const [gltfModule, controlsModule] = await Promise.all([
            import('three/examples/jsm/loaders/GLTFLoader.js'),
            import('three/examples/jsm/controls/OrbitControls.js')
          ])
          return { GLTFLoader: gltfModule.GLTFLoader, OrbitControls: controlsModule.OrbitControls }
        }
      } catch (err) {
        throw new Error(`Failed to load Three.js modules: ${err.message}`)
      }
    }

    const initViewer = async () => {
      try {
        // Load modules
        const { GLTFLoader, OrbitControls: OrbitControlsClass } = await loadModules()
        if (!active) return

        // Create scene
        const scene = new THREE.Scene()
        scene.background = null // transparent

        // Camera
        const width = mount.clientWidth || 200
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
        camera.position.set(3, 3, 5)
        camera.lookAt(0, 0, 0)

        // Renderer
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        mount.appendChild(renderer.domElement)

        // Lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2)
        dirLight1.position.set(5, 10, 7)
        dirLight1.castShadow = true
        scene.add(dirLight1)

        const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.6)
        dirLight2.position.set(-5, -3, -5)
        scene.add(dirLight2)

        const pointLight = new THREE.PointLight(0xffd700, 1.2, 20)
        pointLight.position.set(0, 2, 3)
        scene.add(pointLight)

        // Model group
        const modelGroup = new THREE.Group()
        scene.add(modelGroup)

        // Loading timeout (30 seconds)
        loadingTimeout = setTimeout(() => {
          if (active && loading) {
            console.warn(`Model loading timeout: zone${zoneId}.glb`)
            setError('Loading timed out. The model file may be too large or unavailable.')
            setLoading(false)
          }
        }, 30000)

        // Load GLB model
        const loader = new GLTFLoader()
        const modelUrl = `/models/zone${zoneId}.glb`

        console.log(`🔄 Loading model: ${modelUrl}`)

        loader.load(
          modelUrl,
          // Success callback
          (gltf) => {
            if (!active) return
            clearTimeout(loadingTimeout)

            const model = gltf.scene

            // Enhance materials
            model.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true
                node.receiveShadow = true

                if (node.material) {
                  // Ensure materials render properly
                  node.material.needsUpdate = true

                  // Enhance metallic appearance
                  if (node.material.metalness !== undefined) {
                    node.material.metalness = Math.max(node.material.metalness, 0.5)
                  }
                  if (node.material.roughness !== undefined) {
                    node.material.roughness = Math.min(node.material.roughness, 0.6)
                  }
                }
              }
            })

            // Center and scale model
            const box = new THREE.Box3().setFromObject(model)
            const center = box.getCenter(new THREE.Vector3())
            const size = box.getSize(new THREE.Vector3())

            model.position.sub(center)
            modelGroup.add(model)

            // Adjust camera based on model size
            const maxDim = Math.max(size.x, size.y, size.z)
            const fov = camera.fov * (Math.PI / 180)
            const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5

            camera.position.set(cameraZ * 0.5, cameraZ * 0.5, cameraZ)
            camera.lookAt(0, 0, 0)

            // Orbit controls
            try {
              controls = new OrbitControlsClass(camera, renderer.domElement)
              controls.enableDamping = true
              controls.dampingFactor = 0.05
              controls.maxDistance = cameraZ * 3
              controls.minDistance = cameraZ * 0.2
              controls.target.set(0, 0, 0)
              controls.enablePan = true
              controls.autoRotate = false
            } catch (e) {
              console.warn('OrbitControls initialization failed:', e)
            }

            console.log(`✅ Successfully loaded zone${zoneId}.glb`)
            setLoading(false)
            setLoadProgress(100)
          },
          // Progress callback
          (xhr) => {
            if (xhr.lengthComputable) {
              const percent = Math.round((xhr.loaded / xhr.total) * 100)
              setLoadProgress(percent)
              console.log(`Loading zone${zoneId}.glb: ${percent}%`)
            }
          },
          // Error callback
          (err) => {
            if (!active) return
            clearTimeout(loadingTimeout)

            console.error(`❌ Error loading zone${zoneId}.glb:`, err)

            let errorMsg = 'Failed to load 3D model'
            if (err.message) {
              errorMsg += `: ${err.message}`
            }

            setError(errorMsg)
            setLoading(false)
          }
        )

        // Animation loop
        const clock = new THREE.Clock()
        const animate = () => {
          if (!active) return
          animationFrameId = requestAnimationFrame(animate)

          const delta = clock.getDelta()

          // Update controls
          if (controls) {
            controls.update()
          }

          // Gentle auto-rotation
          if (modelGroup.children.length > 0) {
            modelGroup.rotation.y += 0.002
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

        // Store cleanup function
        return () => {
          window.removeEventListener('resize', handleResize)
          cleanup()
        }

      } catch (err) {
        console.error('Initialization error:', err)
        setError(`Initialization failed: ${err.message}`)
        setLoading(false)
      }
    }

    initViewer()

    return cleanup

  }, [zoneId, height])

  const fileSizes = [17, 19, 28, 30, 23, 15] // MB for zones 1-6

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
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          gap: '10px',
          zIndex: 10
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--accent-cyan)',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Loading Aero Engine Model
          </div>
          {loadProgress > 0 && (
            <>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 'bold'
              }}>
                {loadProgress}% — Zone {zoneId}
              </div>
              <div style={{
                width: '200px',
                height: '4px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${loadProgress}%`,
                  background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))',
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 10px var(--accent-cyan)'
                }} />
              </div>
            </>
          )}
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            marginTop: '4px'
          }}>
            File size: ~{fileSizes[zoneId - 1] || 20}MB
          </div>
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-red)',
          fontSize: '0.85rem',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          padding: '20px',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
            Failed to Load Model
          </div>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            maxWidth: '280px',
            lineHeight: 1.4
          }}>
            {error}
          </div>
          <div style={{
            marginTop: '8px',
            padding: '8px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--accent-red)',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-red)'
          }}>
            /models/zone{zoneId}.glb
          </div>
          <div style={{
            marginTop: '12px',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            maxWidth: '300px'
          }}>
            Check browser console for detailed error logs
          </div>
        </div>
      )}

      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
