import { useEffect } from 'react'

export default function DigitalTwinViewer() {
  useEffect(() => {
    // Add page title update or other frame setup if needed
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#01030a' }}>
      <iframe
        src="/LeakSense_v5_Fixed.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: '#01030a'
        }}
        title="AeroTwin — Aero Piston Engine Digital Twin"
      />
    </div>
  )
}

