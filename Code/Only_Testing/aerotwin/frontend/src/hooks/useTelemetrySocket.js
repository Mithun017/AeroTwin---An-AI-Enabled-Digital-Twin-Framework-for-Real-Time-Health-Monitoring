// useTelemetrySocket.js — persistent WebSocket hook
import { useEffect, useRef } from 'react'
import { useTelemetryStore } from '../state/telemetryStore'

const WS_URL = 'ws://localhost:8000/ws/live'
const RECONNECT_DELAY_MS = 2000

export function useTelemetrySocket() {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const { ingestTick, pushAlert, setConnected, mode } = useTelemetryStore()

  useEffect(() => {
    if (mode !== 'live') return

    function connect() {
      ws.current = new WebSocket(WS_URL)

      ws.current.onopen = () => {
        setConnected(true)
        console.log('[AeroTwin] WebSocket connected')
      }

      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'tick' || msg.type === 'backfill') {
            ingestTick(msg)
          } else if (msg.type === 'alert') {
            pushAlert(msg)
          }
        } catch {}
      }

      ws.current.onclose = () => {
        setConnected(false)
        console.log('[AeroTwin] WebSocket disconnected — reconnecting…')
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    }

    connect()

    // Keepalive ping every 25s
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send('ping')
      }
    }, 25000)

    return () => {
      clearTimeout(reconnectTimer.current)
      clearInterval(pingInterval)
      ws.current?.close()
    }
  }, [mode])
}
