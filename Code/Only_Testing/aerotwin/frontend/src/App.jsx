// App.jsx — Multi-page Navigation with Glassmorphism Popout Drawer & Smooth Animations
import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTelemetrySocket } from './hooks/useTelemetrySocket'
import { useReplay } from './hooks/useReplay'
import { useTelemetryStore } from './state/telemetryStore'

import Sidebar       from './components/Sidebar'
import ChatBot       from './components/ChatBot'
import DashboardPage from './pages/DashboardPage'
import Twin3DPage    from './pages/Twin3DPage'
import AnalyticsPage from './pages/AnalyticsPage'
import HistoryPage   from './pages/HistoryPage'
import SimulatorPage from './pages/SimulatorPage'
import { MenuIcon }  from './components/Icons'

function ConnectionDot() {
  const { connected, mode } = useTelemetryStore()
  const isLive = mode === 'live'
  const color  = !isLive ? '#a78bfa' : connected ? '#22c55e' : '#ef4444'
  const label  = !isLive ? mode.toUpperCase() : connected ? 'LIVE' : 'RECONNECTING'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        boxShadow: `0 0 8px ${color}`,
        animation: (isLive && connected) || !isLive ? 'none' : 'pulse-critical 1s infinite',
      }} />
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.08em' }}>{label}</span>
    </div>
  )
}

function MainLayout() {
  useTelemetrySocket()
  useReplay()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { missionId } = useTelemetryStore()
  const location = useLocation()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 0%, #0d1527 0%, #070b14 100%)',
      overflow: 'hidden',
    }}>
      {/* Popout Navigation Sidebar Drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Glassmorphism Application Header */}
      <header style={{
        height: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Popout Sidebar Drawer Toggle Button */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              background: sidebarOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${sidebarOpen ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: 10,
              color: sidebarOpen ? '#38bdf8' : '#f8fafc',
              width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            title="Toggle Navigation Menu"
          >
            <MenuIcon size={20} color="currentColor" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Aero<span style={{ color: '#38bdf8' }}>Twin</span>
            </span>
            <div style={{ width: 1, height: 18, background: 'rgba(255, 255, 255, 0.1)' }} />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              DRDO MALE UAV Engine Health Twin
            </span>
          </div>
        </div>

        {/* Header Right Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {missionId && (
            <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.06)' }}>
              {missionId}
            </span>
          )}
          <ConnectionDot />
        </div>
      </header>

      {/* Dynamic Route Viewport with Framer Motion Page Transition */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ height: '100%', width: '100%', overflow: 'hidden' }}
          >
            <Routes location={location}>
              <Route path="/"          element={<DashboardPage />} />
              <Route path="/twin"      element={<Twin3DPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/history"   element={<HistoryPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating AI Engine Copilot Widget */}
      <ChatBot />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  )
}
