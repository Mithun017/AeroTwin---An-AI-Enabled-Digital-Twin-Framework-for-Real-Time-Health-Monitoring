// Sidebar.jsx — Permanent Left Navigation Sidebar (5 Consolidated Options)
import { NavLink } from 'react-router-dom'
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
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)', zIndex: 90, transition: 'opacity 0.3s',
          }}
        />
      )}

      <aside style={{
        width: 250, background: '#0b1329', borderRight: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        height: '100%', zIndex: 100,
      }}>
        {/* Header Branding */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 18px', borderBottom: '1px solid #1e293b', background: '#070d1e',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #0284c7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16,
          }}>
            A
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Aero<span style={{ color: '#38bdf8' }}>Twin</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b' }}>DRDO UAV Engine Twin</div>
          </div>
        </div>

        {/* Navigation Options */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', marginBottom: 4 }}>
            System Navigation
          </div>

          {NAV_ITEMS.map(item => {
            const IconComponent = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 12px', borderRadius: 8,
                  textDecoration: 'none',
                  background: isActive ? 'linear-gradient(90deg, #1e293b, #1e3a8a30)' : 'transparent',
                  borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s',
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
        <div style={{ padding: 14, borderTop: '1px solid #1e293b', background: '#070d1e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SYSTEM STATE</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              background: connected ? '#22c55e20' : '#ef444420',
              color: connected ? '#22c55e' : '#ef4444',
            }}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#64748b' }}>Health Index:</span>
            <span style={{ fontWeight: 700, color: healthIndex > 0.75 ? '#22c55e' : healthIndex > 0.5 ? '#f59e0b' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
              {(healthIndex * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
