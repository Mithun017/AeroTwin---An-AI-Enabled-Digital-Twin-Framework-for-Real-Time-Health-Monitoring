import { useEffect, useState } from 'react'

export default function TestGLB() {
  const [logs, setLogs] = useState([])
  const [testResult, setTestResult] = useState('Running tests...')

  const addLog = (msg, type = 'info') => {
    console.log(msg)
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }])
  }

  useEffect(() => {
    const runTests = async () => {
      addLog('🚀 Starting comprehensive Three.js GLB test', 'info')

      // Test 1: Check THREE
      try {
        const THREE = await import('three')
        addLog(`✅ Test 1: THREE.js imported - version r${THREE.REVISION}`, 'success')
      } catch (e) {
        addLog(`❌ Test 1 FAILED: ${e.message}`, 'error')
        setTestResult('FAILED: Cannot import THREE.js')
        return
      }

      // Test 2: Check GLTFLoader (try both paths)
      let GLTFLoader = null
      try {
        const module = await import('three/examples/jsm/loaders/GLTFLoader.js')
        GLTFLoader = module.GLTFLoader
        addLog('✅ Test 2: GLTFLoader imported from examples/jsm', 'success')
      } catch (e1) {
        addLog(`⚠️ Test 2a: examples/jsm failed: ${e1.message}`, 'warn')
        try {
          const module = await import('three/addons/loaders/GLTFLoader.js')
          GLTFLoader = module.GLTFLoader
          addLog('✅ Test 2b: GLTFLoader imported from addons', 'success')
        } catch (e2) {
          addLog(`❌ Test 2 FAILED: ${e2.message}`, 'error')
          setTestResult('FAILED: Cannot import GLTFLoader')
          return
        }
      }

      // Test 3: Create loader instance
      try {
        const loader = new GLTFLoader()
        addLog('✅ Test 3: GLTFLoader instance created', 'success')
      } catch (e) {
        addLog(`❌ Test 3 FAILED: ${e.message}`, 'error')
        setTestResult('FAILED: Cannot instantiate GLTFLoader')
        return
      }

      // Test 4: Check file accessibility
      try {
        const response = await fetch('/models/zone1.glb', { method: 'HEAD' })
        addLog(`✅ Test 4: File accessible - ${response.status} ${response.statusText}`, 'success')
        addLog(`   Size: ${(response.headers.get('content-length') / 1024 / 1024).toFixed(2)} MB`, 'info')
      } catch (e) {
        addLog(`❌ Test 4 FAILED: ${e.message}`, 'error')
        setTestResult('FAILED: Cannot access GLB file')
        return
      }

      // Test 5: Actually load a small portion
      try {
        addLog('🔄 Test 5: Attempting to load zone1.glb...', 'info')
        const loader = new GLTFLoader()

        const loadPromise = new Promise((resolve, reject) => {
          loader.load(
            '/models/zone1.glb',
            (gltf) => {
              addLog(`✅ Test 5: MODEL LOADED SUCCESSFULLY! 🎉`, 'success')
              addLog(`   Scene children: ${gltf.scene.children.length}`, 'info')
              addLog(`   Has animations: ${gltf.animations.length > 0}`, 'info')
              resolve(gltf)
            },
            (xhr) => {
              if (xhr.lengthComputable) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100)
                if (percent % 20 === 0) {
                  addLog(`   Loading: ${percent}%`, 'info')
                }
              }
            },
            (error) => {
              addLog(`❌ Test 5 FAILED: ${error.message}`, 'error')
              addLog(`   Error type: ${error.constructor.name}`, 'error')
              addLog(`   Stack: ${error.stack}`, 'error')
              reject(error)
            }
          )
        })

        const gltf = await loadPromise
        setTestResult('✅✅✅ ALL TESTS PASSED! GLB loading works perfectly!')

      } catch (e) {
        addLog(`❌ Test 5 FAILED: ${e.message}`, 'error')
        setTestResult('FAILED: GLB loading error')
        return
      }
    }

    runTests()
  }, [])

  return (
    <div style={{
      padding: '20px',
      background: '#0a0a0f',
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'monospace'
    }}>
      <h1 style={{ color: '#06b6d4', marginBottom: '20px' }}>
        🧪 Three.js GLB Loading Test
      </h1>

      <div style={{
        padding: '15px',
        marginBottom: '20px',
        background: testResult.includes('PASSED') ? 'rgba(16, 185, 129, 0.2)' :
                   testResult.includes('FAILED') ? 'rgba(239, 68, 68, 0.2)' :
                   'rgba(251, 191, 36, 0.2)',
        border: `2px solid ${testResult.includes('PASSED') ? '#10b981' :
                testResult.includes('FAILED') ? '#ef4444' : '#fbbf24'}`,
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        {testResult}
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.5)',
        padding: '15px',
        borderRadius: '8px',
        maxHeight: '600px',
        overflowY: 'auto',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {logs.map((log, i) => (
          <div key={i} style={{
            marginBottom: '8px',
            paddingLeft: '10px',
            borderLeft: `3px solid ${
              log.type === 'success' ? '#10b981' :
              log.type === 'error' ? '#ef4444' :
              log.type === 'warn' ? '#fbbf24' : '#6b7280'
            }`,
            color: log.type === 'success' ? '#10b981' :
                   log.type === 'error' ? '#ef4444' :
                   log.type === 'warn' ? '#fbbf24' : '#d1d5db'
          }}>
            <span style={{ opacity: 0.6 }}>[{log.time}]</span> {log.msg}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280' }}>
        <p>This test page verifies that Three.js and GLTFLoader are working correctly.</p>
        <p>Check the logs above for detailed diagnostics.</p>
      </div>
    </div>
  )
}
