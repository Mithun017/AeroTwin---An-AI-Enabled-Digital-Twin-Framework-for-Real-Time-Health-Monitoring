// Sidebar.jsx — Smooth Framer Motion Popout Navigation Drawer
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTelemetryStore } from '../state/telemetryStore'
import {
  GaugeIcon, CubeIcon, BrainIcon, HistoryIcon, CompassIcon
} from './Icons'

const NAV_ITEMS = [
  { path: '/',           label: 'Live Telemetry',        icon: GaugeIcon,   desc: 'Section B Sensors & Residuals' },
  { path: '/twin',       label: '3D Twin & Sub-Systems', icon: CubeIcon,    desc: 'Interactive Engine & 6 Sub-Systems' },
  { path: '/analytics',  label: 'Alerts & AI Diagnostics',icon: BrainIcon,   desc: 'Fault Feed, XAI & Anomaly Timeline' },
  { path: '/history',    label: 'Mission Logs & Replay', icon: HistoryIcon, desc: 'Playback Scrubber & CAN Bus Stream' },
  { path: '/simulator',  label: 'What-If Simulator',     icon: CompassIcon, desc: 'Pre-flight Environmental Simulation' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { connected, healthIndex } = useTelemetryStore()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(5, 10, 20, 0.65)',
              backdropFilter: 'blur(8px)',
              zIndex: 99,
            }}
          />

          {/* Smooth Popout Glassmorphism Sidebar */}
          <motion.aside
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 240 }}
            style={{
              position: 'fixed', top: 0, bottom: 0, left: 0,
              width: 270,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex', flexDirection: 'column',
              zIndex: 100,
              boxShadow: '12px 0 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.15)',
              borderTopRightRadius: 20, borderBottomRightRadius: 20,
            }}
          >
            {/* Header Branding */}
            <div style={{
              height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: '#fff', fontSize: 16,
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
                }}>
                  A
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                    Aero<span style={{ color: '#38bdf8' }}>Twin</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>DRDO UAV Engine Twin</div>
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8', width: 28, height: 28, borderRadius: 8,
                  fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Navigation Options */}
            <nav style={{ flex: 1, padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 12px', marginBottom: 4 }}>
                Navigation Drawer
              </div>

              {NAV_ITEMS.map(item => {
                const IconComponent = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 14,
                      textDecoration: 'none',
                      background: isActive ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.15), rgba(37, 99, 235, 0.08))' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#38bdf8' : '#94a3b8',
                      fontWeight: isActive ? 700 : 500,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? '0 4px 14px rgba(56, 189, 248, 0.15)' : 'none',
                    })}
                  >
                    <IconComponent size={18} color="currentColor" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.2 }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.desc}
                      </div>
                    </div>
                  </NavLink>
                )
              })}
            </nav>

            {/* Live Status Summary Card */}
            <div style={{ padding: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(7, 13, 30, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SYSTEM STATE</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 9999,
                  background: connected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: connected ? '#22c55e' : '#ef4444',
                }}>
                  {connected ? 'LIVE STREAM' : 'OFFLINE'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Health Index:</span>
                <span style={{ fontWeight: 800, color: healthIndex > 0.75 ? '#22c55e' : healthIndex > 0.5 ? '#f59e0b' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
                  {(healthIndex * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
