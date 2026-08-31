// useReplay.js — feeds stored mission ticks into the same Zustand store
import { useEffect, useRef } from 'react'
import { useTelemetryStore } from '../state/telemetryStore'

export function useReplay() {
  const { mode, replayTicks, replayIndex, replaySpeed, advanceReplay } = useTelemetryStore()
  const timerRef = useRef(null)

  useEffect(() => {
    if (mode !== 'replay' || replayTicks.length === 0) return
    if (replayIndex >= replayTicks.length - 1) return

    const interval = (1000 / 5) / replaySpeed  // 5Hz base, scaled by speed
    timerRef.current = setInterval(advanceReplay, interval)
    return () => clearInterval(timerRef.current)
  }, [mode, replayTicks, replayIndex, replaySpeed])
}
