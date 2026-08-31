// telemetryStore.js — Zustand global state
// All visual components subscribe here. Never fetch independently.
import { create } from 'zustand'

export const useTelemetryStore = create((set, get) => ({
  // Latest tick data
  latestTick: null,
  sensors: null,
  residual: null,
  mlOutput: null,
  severity: 'normal',
  healthIndex: 1.0,
  missionId: null,

  // History arrays (last 200 ticks)
  healthHistory: [],
  rulHistory: [],
  anomalyHistory: [],

  // Alert feed
  alerts: [],

  // Mode: 'live' | 'replay' | 'whatif'
  mode: 'live',

  // Connection state
  connected: false,

  // Replay state
  replayTicks: [],
  replayIndex: 0,
  replaySpeed: 1.0,

  // Whatif result
  whatifTicks: [],

  // Actions
  setConnected: (v) => set({ connected: v }),

  ingestTick: (tick) => set((s) => {
    const ml = tick.ml_output
    const MAX = 200
    return {
      latestTick: tick,
      sensors: tick.sensors,
      residual: tick.residual,
      mlOutput: ml,
      severity: tick.severity,
      healthIndex: tick.health_index,
      missionId: tick.mission_id,
      healthHistory: [...s.healthHistory.slice(-MAX + 1), tick.health_index],
      anomalyHistory: [...s.anomalyHistory.slice(-MAX + 1), ml?.anomaly_score ?? 0],
      rulHistory: [...s.rulHistory.slice(-MAX + 1), ml?.rul_hours ?? null],
    }
  }),

  pushAlert: (alert) => set((s) => ({
    alerts: [alert, ...s.alerts].slice(0, 50),
  })),

  setMode: (mode) => set({ mode }),

  setReplayTicks: (ticks) => set({ replayTicks: ticks, replayIndex: 0 }),
  setReplaySpeed: (speed) => set({ replaySpeed: speed }),
  advanceReplay: () => set((s) => {
    const next = s.replayIndex + 1
    if (next >= s.replayTicks.length) return {}
    const tick = s.replayTicks[next]
    const ml = tick.ml_output
    const MAX = 200
    return {
      replayIndex: next,
      latestTick: tick,
      sensors: tick.sensors,
      residual: tick.residual,
      mlOutput: ml,
      severity: tick.severity,
      healthIndex: tick.health_index,
      healthHistory: [...s.healthHistory.slice(-MAX + 1), tick.health_index],
      anomalyHistory: [...s.anomalyHistory.slice(-MAX + 1), ml?.anomaly_score ?? 0],
      rulHistory: [...s.rulHistory.slice(-MAX + 1), ml?.rul_hours ?? null],
    }
  }),

  setWhatifTicks: (ticks) => set({ whatifTicks: ticks }),
  clearAlerts: () => set({ alerts: [] }),
}))
