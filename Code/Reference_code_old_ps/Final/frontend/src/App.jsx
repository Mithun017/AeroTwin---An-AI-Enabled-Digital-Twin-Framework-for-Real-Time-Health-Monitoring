import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'

import './index.css'
import DAXConsole from './DAXConsole'
import ChatBot from './ChatBot'
import ZoneGLBViewer from './ZoneGLBViewerFixed'
import ZoneGLBViewerDebug from './ZoneGLBViewerDebug'
import TestGLB from './TestGLB'
import C18DigitalTwin from './C18DigitalTwin'
import DigitalTwinViewer from './DigitalTwinViewer'

// ─── Professional SVG Icons ──────────────────────────────────────
const IconLive = ({ size = 32, color = "var(--accent-emerald)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
    <circle cx="12" cy="12" r="2" fill={color} />
    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
    <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1" />
  </svg>
)

const IconFolder = ({ size = 32, color = "var(--accent-yellow)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const IconSimulation = ({ size = 32, color = "var(--accent-cyan)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

const IconEdit = ({ size = 32, color = "#a78bfa" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
  </svg>
)

const IconSettings = ({ size = 18, color = "var(--text-secondary)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const IconCloudUpload = ({ size = 48, color = "var(--accent-yellow)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '14px', flexShrink: 0, ...style }}>
    <path d="M17.5 19a5.5 5.5 0 0 0 4.5-5.5a5.5 5.5 0 0 0-5.5-5.5H16A8 8 0 1 0 4 16.5" />
    <polyline points="16 12 12 8 8 12" />
    <line x1="12" y1="8" x2="12" y2="21" />
  </svg>
)

const IconAlert = ({ size = 14, color = "var(--accent-red)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IconCheck = ({ size = 14, color = "var(--accent-emerald)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconClipboard = ({ size = 20, color = "var(--text-primary)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
)

const IconChart = ({ size = 20, color = "var(--accent-cyan)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

const IconPin = ({ size = 20, color = "var(--accent-yellow)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const IconWrench = ({ size = 16, color = "var(--accent-yellow)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0, ...style }}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const IconDownload = ({ size = 14, color = "var(--accent-emerald)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0, ...style }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const IconRefresh = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const IconArrowLeft = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

const IconCpu = ({ size = 20, color = "var(--text-secondary)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
)

const IconSignal = ({ size = 20, color = "var(--text-secondary)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4" />
  </svg>
)

const IconZap = ({ size = 14, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const IconPlay = ({ size = 14, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <polygon points="5 3 19 12 5 21 5 3" fill={color === "none" ? "none" : color} />
  </svg>
)

const IconFile = ({ size = 16, color = "var(--text-muted)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const IconLoader = ({ size = 16, color = "var(--accent-cyan)", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin" style={{ flexShrink: 0, ...style }}>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
)


// ─── Intro Video Component ──────────────────────────────────────
function IntroVideo({ onComplete }) {
  const videoRef = useRef(null);

  return (
    <div className="intro-container">
      <video
        ref={videoRef}
        autoPlay
        className="intro-video"
        onEnded={onComplete}
      >
        <source src="/intro_video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <button className="skip-btn" onClick={onComplete}>
        Skip Intro
      </button>
    </div>
  );
}

const API_BASE = 'http://localhost:8000'
const WS_BASE = 'ws://localhost:8000'

const ZONE_NAMES = [
  'No Leak / Healthy',
  'Zone 1 — Intake',
  'Zone 2 — Charge Air',
  'Zone 3 — CAC/Manifold',
  'Zone 4 — Exhaust Manifold',
  'Zone 5 — DPF',
  'Zone 6 — SCR/Tailpipe',
]

// ─── Zone-Specific AI Recommendation Knowledge Base ──────────────────
const ZONE_RECOMMENDATIONS = {
  0: {
    title: 'System Healthy',
    color: 'var(--accent-emerald)',
    description: 'All zones are operating within normal thermodynamic parameters. No corrective action required.',
    actions: [
      'Continue monitoring at current intervals (1 Hz sensor polling)',
      'Next scheduled maintenance per Cat ADEM A4 service interval',
      'Digital twin residuals within ±2% of healthy baseline',
    ],
  },
  1: {
    title: 'Intake Duct Leak',
    color: 'var(--accent-amber)',
    description: 'MAF sensor is the primary indicator. A leak between the airflow meter and compressor inlet reduces measured air mass, affecting fuel-air ratio and power output.',
    actions: [
      'Inspect intake ducting silicone couplers and hose clamps between airflow meter and compressor inlet for cracks or looseness',
      'Perform pressurized smoke test (5 psi) on the cold-side intake circuit to locate hairline splits',
      'Verify MAF sensor connector and wiring harness integrity — contaminated sensor causes false low MAF readings',
      'Check air filter housing seal and bypass valve operation; ensure no vacuum leaks at PCV port',
    ],
  },
  2: {
    title: 'Charge Air Boost Leak',
    color: '#f97316',
    description: 'MAP_boost pressure drop is the primary signal. The hot-side boost circuit between the turbocharger compressor outlet and CAC inlet is under highest pressure.',
    actions: [
      'Inspect V-band clamps and silicone couplers on the hot-side charge pipe from turbo compressor outlet to CAC inlet for blow-off or micro-fractures',
      'Apply soap-bubble solution to all charge pipe joints with engine at idle — bubbles confirm leak points under positive pressure',
      'Check T_boost sensor value against MAP_boost; if T_boost drops simultaneously, blow-by past coupler is likely',
      'Tighten V-band clamps to 12 Nm (dry torque) and re-inspect after 30-minute warm soak',
    ],
  },
  3: {
    title: 'CAC / Manifold Leak',
    color: 'var(--accent-cyan)',
    description: 'Cold-side circuit failure between the Charge Air Cooler (CAC) outlet and intake manifold ports. MAP_cac_out drop indicates downstream pressure loss.',
    actions: [
      'Inspect Charge Air Cooler (CAC) end-tank welds, plastic end-cap joints, and mounting bracket points for cracks or corrosion',
      'Check cold-side hose clamps from CAC outlet to intake manifold inlet — confirm torque spec (8–10 Nm)',
      'Verify intake manifold gasket integrity: look for oil or carbon tracks at the cylinder head interface indicating blow-by',
      'Compare MAP_cac_out vs MAP_cac_in differential; healthy delta < 5 kPa. If ≤15 kPa, CAC core may be blocked or cracked',
    ],
  },
  4: {
    title: 'Exhaust Manifold Leak',
    color: 'var(--accent-red)',
    description: 'T_exh_manifold spike or drop indicates turbine inlet pressure loss. Exhaust leaks bypass turbocharger energy and create severe thermal hazards.',
    actions: [
      'SAFETY FIRST: Allow engine to cool 2 hours before inspection. Exhaust temperatures exceed 600°C at manifold.',
      'Inspect exhaust manifold-to-cylinder-head gasket sealing surfaces for carbon tracking, soot deposits, or visible cracks',
      'Check all V-band clamps and mounting studs at the turbocharger turbine housing flange — studs can snap from thermal cycling',
      'Compare T_exh with T_post_turbine residuals; large bypass = small T drop across turbine = low turbo energy recovery',
    ],
  },
  5: {
    title: 'DPF System Leak',
    color: '#a78bfa',
    description: 'Differential pressure sensor (dP_dpf) deviation indicates bypass around or through the Diesel Particulate Filter. Emissions compliance at risk.',
    actions: [
      'Inspect DPF housing inlet and outlet flanges for loose V-band clamps, cracked welds, or erosion damage',
      'Check DOC (Diesel Oxidation Catalyst) to DPF inlet pipe joints and mounting bolts — torque to 40 Nm if loose',
      'Inspect dP_dpf sensor lines for carbon or soot blockage causing false readings; clean or replace sensor lines if blocked',
      'If dP_dpf drops to near-zero, DPF substrate may be cracked or bypassed — borescope inspection required before regen cycle',
    ],
  },
  6: {
    title: 'SCR / Tailpipe Leak',
    color: '#f472b6',
    description: 'Downstream aftertreatment bypass. SCR efficiency loss and T_dpf_out residual deviation indicate urea dosing bypass or exhaust bypass around the catalytic reduction unit.',
    actions: [
      'Inspect SCR inlet and outlet V-band clamps and mounting flanges for looseness; look for urea crystallization at joints',
      'Check DEF (AdBlue) injector mounting boss and dosing valve seating — urea spray on hot exhaust casing indicates injector seal failure',
      'Inspect exhaust tailpipe connection to SCR outlet for fractures or complete pipe separation under thermal stress',
      'Compare T_SCR vs T_dpf_out differential; healthy SCR reduces NOx with 20–40°C exotherm. If zero ΔT, SCR catalyst may be poisoned',
    ],
  },
}

const EF_CHANNELS = ['MAF', 'MAP_boost', 'MAP_cac_out', 'T_cac_out', 'T_exh', 'dP_dpf']

const SENSOR_UNITS = {
  RPM: 'rpm', MAF: 'kg/h', MAP_intake: 'kPa', MAP_boost: 'kPa',
  MAP_cac_in: 'kPa', MAP_cac_out: 'kPa', T_intake: '°C', T_boost: '°C',
  T_cac_out: '°C', T_exh_manifold: '°C', T_dpf_in: '°C', T_dpf_out: '°C',
  fuel_qty: 'mg/str', dP_dpf: 'kPa',
  // Extended sensors
  turbo_speed: 'rpm', P_exh_manifold: 'kPa', P_turbine_out: 'kPa',
  P_tailpipe: 'kPa', T_DOC: '°C', T_SCR: '°C',
}

// ─── Sidebar Navigation Icons ───────────────────────────────────
const NavIconUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const NavIconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
)

const NavIconAnalysis = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

const NavIconHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const NavIconSensorHub = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
)

const NavIconDigitalTwin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)

// ─── Sidebar Component ──────────────────────────────────────────
function Sidebar({ isConnected, isCollapsed, onToggle }) {
  const location = useLocation()
  const currentPath = location.pathname

  const navItems = [
    { id: 'upload', path: '/upload', icon: <NavIconUpload />, label: 'Upload & Check' },
    { id: 'dashboard', path: '/dashboard', icon: <NavIconDashboard />, label: 'Dashboard' },
    { id: 'engine', path: '/engine', icon: <NavIconAnalysis />, label: 'Analysis' },
    { id: 'history', path: '/history', icon: <NavIconHistory />, label: 'History' },
    { id: 'dax', path: '/dax', icon: <NavIconSensorHub />, label: 'Sensor Hub' },
    { id: 'digital-twin', path: '/digital-twin', icon: <NavIconDigitalTwin />, label: 'Digital Twin' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div
            className="sidebar-logo-icon"
            onClick={onToggle}
            style={{ cursor: 'pointer' }}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            L
          </div>
          <div className="sidebar-logo-text">
            <h1>AeroTwin</h1>
            <span>MALE UAV Aero Engine Diagnostics</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = currentPath === item.path || (item.id === 'dashboard' && currentPath === '/')
          return (
            <Link
              key={item.id}
              to={item.path}
              id={`nav-${item.id}`}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="engine-badge">
          <span className="dot" style={{
            background: isConnected ? 'var(--accent-emerald)' : 'var(--accent-red)',
          }}></span>
          <span>Aero Piston Engine • ADEM</span>
        </div>
      </div>
    </aside>
  )
}

// ─── Go/No-Go Indicator ─────────────────────────────────────────
function GoNoGoIndicator({ status, confidence }) {
  const isGo = status === 'GO'
  const isHold = status === 'HOLD - TRANSIENT' || status === 'HOLD'

  let cardClass = 'nogo-indicator'
  let textClass = 'nogo'
  let subtitle = 'Leak Detected'

  if (isGo) {
    cardClass = 'go-indicator'
    textClass = 'go'
    subtitle = 'Engine Healthy'
  } else if (isHold) {
    cardClass = 'hold-indicator'
    textClass = 'hold'
    subtitle = 'Diagnostics Suspended'
  }

  const barColor = isGo ? 'var(--accent-emerald)' : (isHold ? 'var(--accent-yellow)' : 'var(--accent-red)')

  return (
    <div className={`card go-nogo-card ${cardClass}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
      <div>
        <div className="card-header">
          <span className="card-title">Status</span>
          <span className="card-icon"></span>
        </div>
        <div className={`go-nogo-status ${textClass}`}>
          {status}
        </div>
        <div className="go-nogo-subtitle" style={{ marginBottom: '12px' }}>
          {subtitle}
        </div>
      </div>

      {confidence !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            <span>Confidence</span>
            <span style={{ color: barColor, fontWeight: '700' }}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round(confidence * 100)}%`,
              background: barColor,
              boxShadow: `0 0 8px ${barColor}`,
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Confidence Ring ─────────────────────────────────────────────
function ConfidenceRing({ confidence, leakDetected, zoneId }) {
  const show3DModel = leakDetected && zoneId && zoneId > 0

  return (
    <div className="card confidence-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-header">
        <span className="card-title">Engine Diagnostic Viewer</span>
        {show3DModel && <span style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', textTransform: 'uppercase', fontWeight: 'bold' }}>3D Zone {zoneId}</span>}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '130px', margin: '0 0 12px' }}>
        {show3DModel ? (
          <ZoneGLBViewer zoneId={zoneId} height={130} />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600' }}>3D Model Display</p>
            <p style={{ margin: '0', fontSize: '11px', opacity: 0.7 }}>Awaiting leak detection...</p>
          </div>
        )}
      </div>
      <div className="confidence-label">
        {leakDetected ? 'Anomaly Detected' : 'Normal Operation'}
      </div>
    </div>
  )
}

// ─── Leak Alert Card ─────────────────────────────────
function LeakAlertCard({ data }) {
  const getSeverityClass = (sev) => {
    const map = { NONE: 'severity-none', SMALL: 'severity-small', MEDIUM: 'severity-medium', CRITICAL: 'severity-critical' }
    return map[sev] || 'severity-none'
  }

  const zoneIdx = data.leak_detected ? (data.suspected_zone_idx || 0) : 0
  const rec = ZONE_RECOMMENDATIONS[zoneIdx] || ZONE_RECOMMENDATIONS[0]
  const isLeak = data.leak_detected

  return (
    <div className="card alert-card">
      <div className="card-header">
        <span className="card-title">Leak Analysis</span>
        <span className="card-icon"></span>
      </div>
      <div className="alert-content">
        <div className="alert-zone" style={{ color: isLeak ? rec.color : 'var(--accent-emerald)' }}>
          {data.suspected_zone || ZONE_NAMES[0]}
        </div>
        <div>
          <span className={`alert-severity ${getSeverityClass(data.severity)}`}>
            {data.severity || 'NONE'}
          </span>
        </div>
        {data.flow_loss_pct > 0 && (
          <div className="alert-flow-loss">
            Estimated Flow Loss: <strong>{data.flow_loss_pct?.toFixed(1)}%</strong>
          </div>
        )}
        <div className="alert-action">
          {data.recommended_action || 'System operating within normal parameters.'}
        </div>
      </div>
    </div>
  )
}

// ─── Sensor Grid Card ────────────────────────────────────────────
function SensorGrid({ sensors }) {
  const entries = Object.entries(sensors || {})
  return (
    <div className="card sensors-card">
      <div className="card-header">
        <span className="card-title">Live Sensors</span>
        <span className="card-icon"></span>
      </div>
      <div className="sensor-grid">
        {entries.map(([key, val]) => (
          <div className="sensor-item" key={key}>
            <div className="sensor-label">{key.replace(/_/g, ' ')}</div>
            <div className="sensor-value">
              {typeof val === 'number' ? val.toFixed(1) : val}
              <span className="sensor-unit">{SENSOR_UNITS[key] || ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Energy Field Heatmap ────────────────────────────────────────
function EnergyFieldHeatmap({ efData }) {
  const matrix = efData?.matrix || Array(6).fill(Array(6).fill(0))

  const getColor = (val) => {
    if (val === 0) return '#316237'
    const v = Math.max(-1, Math.min(1, val))
    if (v >= 0) {
      const r = Math.round(255 * v)
      const g = Math.round(100 * (1 - v))
      const b = Math.round(50 * (1 - v))
      return `rgb(${r}, ${g}, ${b})`
    } else {
      const r = Math.round(252 * (1 + v))
      const g = Math.round(212 * (1 + v))
      const b = Math.round(65 * (1 + v))
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  return (
    <div className="card heatmap-card">
      <div className="card-header">
        <span className="card-title">Energy Field</span>
        <span className="card-icon"></span>
      </div>
      <div className="heatmap-container">
        {matrix.map((row, i) => (
          <div className="heatmap-row" key={i}>
            <div className="heatmap-label">{EF_CHANNELS[i]}</div>
            {(Array.isArray(row) ? row : []).map((val, j) => (
              <div
                className="heatmap-cell"
                key={j}
                style={{ background: getColor(val || 0) }}
              >
                {typeof val === 'number' ? val.toFixed(2) : '0'}
              </div>
            ))}
          </div>
        ))}
        <div className="heatmap-col-labels">
          {EF_CHANNELS.map(ch => (
            <div className="heatmap-col-label" key={ch}>{ch}</div>
          ))}
        </div>
      </div>
      <div className="ef-metrics">
        <div className="ef-metric">
          <div className="ef-metric-value" style={{
            color: (efData?.global_deviation || 0) > 3 ? 'var(--accent-red)' : 'var(--accent-emerald)'
          }}>
            {(efData?.global_deviation || 0).toFixed(2)}
          </div>
          <div className="ef-metric-label">Global Deviation</div>
        </div>
        <div className="ef-metric">
          <div className="ef-metric-value" style={{
            color: (efData?.cosine_similarity || 1) < 0.9 ? 'var(--accent-amber)' : 'var(--accent-cyan)'
          }}>
            {(efData?.cosine_similarity || 1).toFixed(3)}
          </div>
          <div className="ef-metric-label">Cosine Similarity</div>
        </div>
        <div className="ef-metric">
          <div className="ef-metric-value" style={{ color: 'var(--accent-purple)' }}>
            {efData?.most_disrupted_sensor || 'N/A'}
          </div>
          <div className="ef-metric-label">Most Disrupted</div>
        </div>
      </div>
    </div>
  )
}

// ─── Residuals Card ──────────────────────────────────────────────
function ResidualsCard({ residuals }) {
  const entries = Object.entries(residuals || {})

  const getBarColor = (val) => {
    const abs = Math.abs(val)
    if (abs > 20) return 'var(--accent-red)'
    if (abs > 10) return 'var(--accent-yellow)'
    return 'var(--accent-yellow)'
  }

  return (
    <div className="card residuals-card">
      <div className="card-header">
        <span className="card-title">Digital Twin Residuals</span>
        <span className="card-icon"></span>
      </div>
      <div className="residuals-grid">
        {entries.map(([key, val]) => (
          <div className="residual-item" key={key}>
            <div className="residual-name">{key.replace('res_', '').replace(/_/g, ' ')}</div>
            <div className="residual-value" style={{ color: getBarColor(val) }}>
              {typeof val === 'number' ? val.toFixed(2) : val}
            </div>
            <div className="residual-bar">
              <div
                className="residual-bar-fill"
                style={{
                  width: `${Math.min(Math.abs(val || 0) * 2, 100)}%`,
                  background: getBarColor(val || 0),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Zone Probabilities ──────────────────────────────────────────
function ZoneProbabilities({ probs, data }) {
  const probArray = probs || [1, 0, 0, 0, 0, 0]
  const colors = [
    'var(--accent-emerald)', 'var(--accent-yellow)', 'var(--accent-yellow)',
    'var(--accent-yellow)', 'var(--accent-yellow)', 'var(--accent-yellow)', 'var(--accent-red)'
  ]

  // Find top suspect zone (excluding index 0 = Healthy)
  const leakDetected = data?.leak_detected
  const zoneIdx = data?.suspected_zone_idx || 0
  const rec = ZONE_RECOMMENDATIONS[leakDetected ? zoneIdx : 0] || ZONE_RECOMMENDATIONS[0]

  return (
    <div className="card zone-probs-card">
      <div className="card-header">
        <span className="card-title">Zone Probabilities</span>
        <span className="card-icon"></span>
      </div>
      <div className="zone-bars">
        {ZONE_NAMES.map((name, i) => (
          <div className="zone-bar-item" key={i}>
            <div className="zone-bar-label">{name.split('—')[0].trim()}</div>
            <div className="zone-bar-track">
              <div
                className="zone-bar-fill"
                style={{
                  width: `${(probArray[i] || 0) * 100}%`,
                  background: colors[i],
                }}
              >
                {(probArray[i] || 0) > 0.1 ? `${((probArray[i] || 0) * 100).toFixed(0)}%` : ''}
              </div>
            </div>
            <div className="zone-bar-value">{((probArray[i] || 0) * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>

      {/* ─── AI Recommendation Panel in the empty space below the bars ─── */}
      <div className={`zone-rec-panel ${leakDetected ? 'zone-rec-leak' : 'zone-rec-healthy'}`}
        style={{ borderColor: rec.color }}>
        <div className="zone-rec-header" style={{ color: rec.color }}>
          <span className="zone-rec-status-dot" style={{ backgroundColor: rec.color }} />
          <span className="zone-rec-header-title">{rec.title}</span>
          {leakDetected && (
            <span className="zone-rec-badge" style={{ background: rec.color }}>
              ZONE {zoneIdx}
            </span>
          )}
        </div>
        <p className="zone-rec-desc">{rec.description}</p>
        <div className="zone-rec-actions">
          {rec.actions.map((action, i) => (
            <div key={i} className="zone-rec-action-row">
              <span className="zone-rec-action-bullet" style={{ backgroundColor: rec.color }} />
              <span className="zone-rec-action-text">{action}</span>
            </div>
          ))}
        </div>
        {leakDetected && data?.recommended_action && (
          <div className="zone-rec-ai-line">
            <span className="zone-rec-ai-badge">Qwen 3 (4B)</span>
            {data.recommended_action}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Engine Diagram ──────────────────────────────────────────────
function EngineDiagram({ zoneIdx, leakDetected, onZoneClick }) {
  const getZoneCard = (id, name, desc) => (
    <div
      className={`engine-zone ${leakDetected && zoneIdx === id ? 'leak' : 'healthy'}`}
      onClick={() => onZoneClick && onZoneClick(id)}
      style={{ cursor: onZoneClick ? 'pointer' : 'default' }}
    >
      <div className="engine-zone-name">{name}</div>
      <div className="engine-zone-desc">{desc}</div>
    </div>
  )

  return (
    <div className="card engine-card">
      <div className="card-header">
        <span className="card-title">Aero Piston Engine — Zone Map (Click to Simulate)</span>
        <span className="card-icon"></span>
      </div>
      <div className="engine-diagram-grid">
        {/* Row 1: Zones 1 to 4 */}
        <div className="grid-cell-1">{getZoneCard(1, 'Zone 1', 'Intake — Airflow meter → Compressor')}</div>
        <div className="grid-arrow-1">→</div>

        <div className="grid-cell-2">{getZoneCard(2, 'Zone 2', 'Charge Air — Compressor → CAC')}</div>
        <div className="grid-arrow-2">→</div>

        <div className="grid-cell-3">{getZoneCard(3, 'Zone 3', 'CAC/Manifold — CAC → Intake ports')}</div>
        <div className="grid-arrow-3">→</div>

        <div className="grid-cell-4">{getZoneCard(4, 'Zone 4', 'Exhaust — Manifold → Turbine')}</div>
        <div className="grid-arrow-4">→</div>

        {/* Row 2: Zones 5 and 6 under Zone 2 and 3 */}
        <div className="grid-cell-5">{getZoneCard(5, 'Zone 5', 'Aftertreatment — DPF')}</div>
        <div className="grid-arrow-5">→</div>

        <div className="grid-cell-6">{getZoneCard(6, 'Zone 6', 'Aftertreatment — SCR/Tailpipe')}</div>
      </div>
    </div>
  )
}

// ─── History Table ───────────────────────────────────────────────
function HistoryTable({ history }) {
  return (
    <div className="card history-card">
      <div className="card-header">
        <span className="card-title">Prediction History</span>
        <span className="card-icon"></span>
      </div>
      <table className="history-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Status</th>
            <th>Confidence</th>
            <th>Zone</th>
            <th>Severity</th>
            <th>Go/No-Go</th>
          </tr>
        </thead>
        <tbody>
          {(history || []).slice(-15).reverse().map((item, i) => (
            <tr key={i}>
              <td>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '-'}</td>
              <td style={{ color: item.leak_detected ? 'var(--accent-red)' : 'var(--accent-emerald)', fontWeight: 'bold' }}>
                <span className={`status-dot ${item.leak_detected ? 'leak' : 'healthy'}`}></span>
                {item.leak_detected ? 'LEAK' : 'OK'}
              </td>
              <td>{(item.confidence * 100).toFixed(1)}%</td>
              <td>{item.suspected_zone?.split('—')[0]?.trim() || '-'}</td>
              <td>
                <span className={`alert-severity ${item.severity === 'CRITICAL' ? 'severity-critical' :
                  item.severity === 'MEDIUM' ? 'severity-medium' :
                    item.severity === 'SMALL' ? 'severity-small' : 'severity-none'
                  }`}>{item.severity || 'NONE'}</span>
              </td>
              <td style={{ color: item.go_no_go === 'GO' ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 700 }}>
                {item.go_no_go}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Interactive Level Meters ────────────────────────────────────
function InteractiveLevelMeters({ sensors, setSensors, onSensorChange }) {
  const configs = [
    { key: 'RPM', label: 'Engine Speed', min: 1000, max: 2500, step: 10 },
    { key: 'MAF', label: 'Mass Air Flow', min: 400, max: 1500, step: 5 },
    { key: 'MAP_boost', label: 'Boost Pressure', min: 100, max: 350, step: 2 },
    { key: 'T_cac_out', label: 'Charge Air Temp', min: 20, max: 80, step: 1 },
    { key: 'T_exh_manifold', label: 'Exhaust Temp', min: 300, max: 800, step: 5 },
    { key: 'dP_dpf', label: 'DPF Delta P', min: 0, max: 20, step: 0.1 },
    { key: 'fuel_qty', label: 'Fuel Injection', min: 50, max: 200, step: 1 }
  ];

  const handleChange = (key, val) => {
    const newVal = Number(val);
    const newSensors = { ...sensors, [key]: newVal };
    setSensors(newSensors);
    onSensorChange(newSensors);
  };

  return (
    <div className="card level-meters-card" style={{ gridColumn: 'span 2' }}>
      <div className="card-header">
        <span className="card-title">Live Sensor Overrides</span>
        <span className="card-icon"></span>
      </div>
      <div className="level-meters-container">
        {configs.map(c => {
          const val = sensors[c.key] || c.min;
          const pct = ((val - c.min) / (c.max - c.min)) * 100;
          return (
            <div className="level-meter" key={c.key}>
              <div className="level-meter-label">
                <span>{c.label}</span>
                <span>{val}</span>
              </div>
              <input
                type="range"
                className="level-meter-input"
                min={c.min} max={c.max} step={c.step}
                value={val}
                onChange={e => handleChange(c.key, e.target.value)}
                style={{ background: `linear-gradient(to right, var(--accent-yellow) ${pct}%, var(--bg-glass) ${pct}%)` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Energy Field Graph ──────────────────────────────────────────
function EnergyFieldGraph({ efData }) {
  const matrix = efData?.matrix || Array(6).fill(Array(6).fill(0));
  const channels = ['MAF', 'Boost', 'CAC Out', 'Exhaust', 'DPF', 'RPM'];

  const values = matrix.map(row => {
    if (Array.isArray(row)) {
      return row.reduce((a, b) => a + Math.abs(b), 0) / (row.length || 1);
    }
    return 0;
  });

  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <div className="card-header">
        <span className="card-title">Energy Field Deviation</span>
        <span className="card-icon"></span>
      </div>
      <div className="ef-graph-container">
        {values.map((v, i) => (
          <div key={i} className="ef-graph-bar" style={{ height: `${Math.min(100, Math.max(5, v * 100))}%` }}>
            <div className="ef-graph-label">{channels[i] || `CH${i + 1}`}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Acoustic Leak Detector Component ──────────────────────────────
function AcousticLeakDetector({
  audioFiles,
  selectedCategory,
  selectedFile,
  setSelectedFile,
  handleCategoryChange,
  analyzeSound,
  acousticResult,
  isLoading
}) {
  const categories = [
    { id: 'good', name: 'Healthy Sounds' },
    { id: 'leak', name: 'Leak Sounds' }
  ];

  const files = audioFiles[selectedCategory] || [];
  const audioUrl = selectedFile ? `${API_BASE}/api/audio/play/${selectedCategory}/${selectedFile}` : '';

  return (
    <div className="card acoustic-card">
      <div className="card-header">
        <span className="card-title">Optional Acoustic Validation (Auxiliary Verification)</span>
        <span className="card-icon">🔊</span>
      </div>
      <div className="acoustic-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>

        <div className="acoustic-control-group" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label className="sensor-label" style={{ marginBottom: '5px', display: 'block' }}>Engine State</label>
            <select
              className="demo-select"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              value={selectedCategory}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 2 }}>
            <label className="sensor-label" style={{ marginBottom: '5px', display: 'block' }}>Select Audio Track</label>
            <select
              className="demo-select"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              value={selectedFile}
              onChange={e => setSelectedFile(e.target.value)}
            >
              {files.map(f => (
                <option key={f} value={f}>{f.replace('engine_', '').replace('.wav', '')}</option>
              ))}
            </select>
          </div>
        </div>

        {audioUrl && (
          <div className="audio-player-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span className="sensor-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Audio Player</span>
            <audio key={audioUrl} controls style={{ width: '100%', height: '32px' }}>
              <source src={audioUrl} type="audio/wav" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <button
          className="demo-btn"
          style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-yellow) 0%, #ff9800 100%)', color: '#000', fontWeight: 'bold', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}
          onClick={analyzeSound}
          disabled={isLoading || !selectedFile}
        >
          {isLoading ? 'Analyzing Audio Frequencies...' : 'Analyze Audio Leak Signatures'}
        </button>

        {acousticResult && (
          <div className="acoustic-result-wrapper" style={{ animation: 'fadeIn 0.3s ease-in-out', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid',
              background: 'var(--bg-secondary)',
              borderColor: acousticResult.prediction === 'LEAK' ? 'var(--accent-red)' : 'var(--accent-emerald)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Acoustic Classification</div>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: acousticResult.prediction === 'LEAK' ? 'var(--accent-red)' : 'var(--accent-emerald)'
                }}>
                  {acousticResult.prediction}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Probability</div>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: acousticResult.prediction === 'LEAK' ? 'var(--accent-red)' : 'var(--accent-emerald)'
                }}>
                  {Math.round((acousticResult.prediction === 'LEAK' ? acousticResult.leak_probability : acousticResult.healthy_probability) * 100)}%
                </div>
              </div>
            </div>

            <div className="acoustic-features" style={{ fontSize: '0.75rem', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>RMS Energy:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{acousticResult.features.rms.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Peak Amp:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{acousticResult.features.peak.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Spectral Centroid:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--text-accent)' }}>{acousticResult.features.spectral_centroid.toFixed(0)} Hz</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Zero-Crossing Rate:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{acousticResult.features.zero_crossings.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gridColumn: 'span 2', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>High Frequency (4kHz+) Energy Ratio:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: acousticResult.prediction === 'LEAK' ? 'var(--accent-red)' : 'var(--text-primary)' }}>{(acousticResult.features.band_4 * 1000).toFixed(2)}‰</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Upload & Check Page ─────────────────────────────────────────
function UploadCheckPage({
  onStartLive,
  setPredictionData,
  setHistory,
  setBatchStatus,
  results,
  setResults,
  setSelectedBatchRowIndex,
  confThreshold,
  setConfThreshold,
  setIsIdle
}) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null)   // null|'upload'|'synthetic'|'paste'
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [parseInfo, setParseInfo] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [liveRow, setLiveRow] = useState(null)
  const [summary, setSummary] = useState(null)
  const [expandedRow, setExpandedRow] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')    // all|leak|ok
  const [sortCol, setSortCol] = useState('row_index')
  const [sortDir, setSortDir] = useState('asc')
  const [hoveredMode, setHoveredMode] = useState(null)
  const fileInputRef = useRef(null)
  const cancelRef = useRef(false)

  // Advanced config
  const [analysisSpeed, setAnalysisSpeed] = useState('normal')  // fast|normal|detailed
  const [leakOnlyView, setLeakOnlyView] = useState(false)

  // Synthetic simulation config
  const [synthRPM, setSynthRPM] = useState(1800)
  const [synthZone, setSynthZone] = useState(2)
  const [synthSeverity, setSynthSeverity] = useState(2)
  const [synthCount, setSynthCount] = useState(20)

  const speedDelayMap = { fast: 20, normal: 50, detailed: 120 }

  /* ── Parsers ── */
  function normalizeRowKeys(row) {
    const norm = {}
    Object.keys(row || {}).forEach(k => {
      let normKey = k.trim()
      // Normalize common truncated or alternative headers
      if (normKey.startsWith('CoolantTe')) normKey = 'CoolantTemp'
      if (normKey.startsWith('ThrottlePo')) normKey = 'ThrottlePosition'
      if (normKey.startsWith('HealthScor')) normKey = 'HealthScore'
      if (normKey === 'Boost') normKey = 'MAP_boost'
      norm[normKey] = row[k]
    })
    return norm
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row = {}
      headers.forEach((h, i) => {
        const v = vals[i]
        row[h] = v !== undefined && v !== '' && !isNaN(v) ? Number(v) : v
      })
      return row
    })
  }
  function parseJSON(text) { const p = JSON.parse(text); return Array.isArray(p) ? p : [p] }

  /* ── File handling ── */
  const handleFileDrop = (f) => {
    setFile(f); setResults([]); setSummary(null); setParseInfo(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = f.name.endsWith('.json') ? parseJSON(e.target.result) : parseCSV(e.target.result)
        const normalizedRows = rows.map(normalizeRowKeys)
        setParsedRows(normalizedRows)
        setParseInfo({ rows: normalizedRows.length, cols: Object.keys(normalizedRows[0] || {}).length, columns: Object.keys(normalizedRows[0] || {}) })
      } catch (err) { setParseInfo({ error: err.message }) }
    }
    reader.readAsText(f)
  }

  /* ── Core analysis engine ── */
  const runAnalysis = async (rowsToRun) => {
    const rows = rowsToRun || parsedRows
    if (!rows.length) return

    // Switch to Dashboard immediately
    navigate('/dashboard')
    setIsIdle(false) // Exit idle mode to show telemetry
    setSelectedBatchRowIndex(null) // Reset selection

    setIsAnalyzing(true); setProgress(0); setResults([]); setSummary(null)
    setBatchStatus({ isAnalyzing: true, progress: 0, current: 0, total: rows.length, summary: null })

    cancelRef.current = false
    const all = []
    const delay = speedDelayMap[analysisSpeed]

    for (let i = 0; i < rows.length; i++) {
      if (cancelRef.current) break
      try {
        const res = await fetch(`${API_BASE}/api/predict`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rows[i], session_id: window.sessionId })
        })
        const d = await res.json()
        if (d.confidence < confThreshold && !d.leak_detected) {
          d.go_no_go = 'GO'; d.leak_detected = false
        }
        const row = { ...d, row_index: i + 1, source: rows[i] }
        all.push(row); setResults([...all]); setLiveRow(row)

        const prog = Math.round(((i + 1) / rows.length) * 100)
        setProgress(prog)
        setBatchStatus({ isAnalyzing: true, progress: prog, current: i + 1, total: rows.length, summary: null })

        // Update live visualization values on dashboard
        setPredictionData(row)
        setHistory(prev => [...prev.slice(-100), row])
        setSelectedBatchRowIndex(i)
      } catch (err) { all.push({ row_index: i + 1, error: err.message }) }
      await new Promise(r => setTimeout(r, delay))
    }

    /* summary */
    const valid = all.filter(r => !r.error)
    const leaks = valid.filter(r => r.leak_detected)
    const zoneCounts = {}, sevCounts = { NONE: 0, SMALL: 0, MEDIUM: 0, CRITICAL: 0 }
    leaks.forEach(r => {
      const z = r.suspected_zone || ZONE_NAMES[0]
      zoneCounts[z] = (zoneCounts[z] || 0) + 1
      sevCounts[r.severity] = (sevCounts[r.severity] || 0) + 1
    })
    valid.filter(r => !r.leak_detected).forEach(() => sevCounts['NONE']++)
    const avgConf = valid.reduce((s, r) => s + (r.confidence || 0), 0) / (valid.length || 1)
    const worst = leaks.reduce((mx, r) => r.confidence > (mx?.confidence || 0) ? r : mx, null)
    const primary = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]
    const calculatedSummary = {
      total: rows.length, valid: valid.length, leaks: leaks.length,
      healthy: valid.length - leaks.length,
      leakRate: valid.length ? ((leaks.length / valid.length) * 100).toFixed(1) : '0.0',
      avgConf: (avgConf * 100).toFixed(1), zoneCounts, sevCounts, worst, primary
    }
    setSummary(calculatedSummary)
    setBatchStatus({ isAnalyzing: false, progress: 100, current: rows.length, total: rows.length, summary: calculatedSummary })
    setIsAnalyzing(false)
  }

  /* ── Synthetic data generation ── */
  const runSynthetic = async () => {
    const rows = []
    for (let i = 0; i < synthCount; i++) {
      const isLeak = i % 3 !== 0 // Mix healthy and leaks
      rows.push({
        RPM: synthRPM + (Math.random() - 0.5) * 200,
        MAF: isLeak ? 700 + Math.random() * 100 : 850 + Math.random() * 50,
        MAP_boost: isLeak ? 180 + Math.random() * 20 : 215 + Math.random() * 15,
        MAP_cac_out: 200 + Math.random() * 10,
        T_cac_out: isLeak ? 55 + Math.random() * 10 : 45 + Math.random() * 5,
        T_exh_manifold: isLeak ? 620 + Math.random() * 50 : 550 + Math.random() * 30,
        dP_dpf: 0.4 + Math.random() * 0.2,
        fuel_qty: 110 + Math.random() * 20,
        _override_zone: isLeak ? synthZone : 0,
        _override_severity: isLeak ? synthSeverity : 0,
      })
    }
    setParsedRows(rows); setParseInfo({ rows: rows.length, cols: 9, columns: Object.keys(rows[0]) })
    await runAnalysis(rows)
  }

  /* ── Paste mode ── */
  const runPaste = () => {
    try {
      const rows = parseJSON(pasteText)
      const normalizedRows = rows.map(normalizeRowKeys)
      setParsedRows(normalizedRows)
      setParseInfo({ rows: normalizedRows.length, cols: Object.keys(normalizedRows[0] || {}).length, columns: Object.keys(normalizedRows[0] || {}) })
      runAnalysis(normalizedRows)
    } catch (err) { alert('Invalid JSON: ' + err.message) }
  }

  /* ── Export to CSV ── */
  const exportCSV = () => {
    if (!results.length) return
    const headers = ['Row', 'Status', 'Confidence', 'Zone', 'Severity', 'Flow_Loss', 'GO_NOGO']
    const rows = results.map(r => [
      r.row_index, r.leak_detected ? 'LEAK' : 'OK',
      r.confidence ? (r.confidence * 100).toFixed(1) + '%' : '', r.suspected_zone || '',
      r.severity || '', r.flow_loss_pct?.toFixed(1) || '', r.go_no_go || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'aerotwin_results.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    cancelRef.current = true
    setMode(null); setFile(null); setParsedRows([]); setParseInfo(null)
    setResults([]); setSummary(null); setProgress(0); setLiveRow(null); setPasteText('')
    setSelectedBatchRowIndex(null)
  }

  /* ── Filtered + sorted table rows ── */
  const tableRows = [...results]
    .filter(r => filterStatus === 'all' || (filterStatus === 'leak' && r.leak_detected) || (filterStatus === 'ok' && !r.leak_detected))
    .sort((a, b) => {
      let va = a[sortCol] || 0, vb = b[sortCol] || 0
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase()
      return sortDir === 'asc' ? va > vb ? 1 : -1 : va < vb ? 1 : -1
    })

  const GLOW_COLORS = {
    live: '52,211,153',
    upload: '251,191,36',
    synthetic: '6,182,212',
    paste: '167,139,250',
  }

  /* ── SOURCE SELECTION SCREEN ── */
  if (!mode) return (
    <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Premium Header */}
      <div style={{
        padding: '28px 32px', borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(167,139,250,0.06) 50%, rgba(52,211,153,0.08) 100%)',
        border: '1px solid rgba(6,182,212,0.2)', position: 'relative', overflow: 'hidden'
      }}>
        {/* Animated grid BG */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-emerald)',
                  boxShadow: '0 0 12px var(--accent-emerald)', animation: 'pulse 2s infinite'
                }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  System Ready
                </span>
              </div>
              <h2 style={{
                margin: 0,
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                color: 'var(--text-primary)'
              }}>
                Upload &amp; Check
              </h2>
              <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', lineHeight: 1.6 }}>
                Advanced diagnostic data pipeline. Select a source to run all sensor readings through the full
                ML ensemble, digital twin residual engine, and energy field correlator.
              </p>
            </div>
            {/* System Stats */}
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { label: 'ML Models', val: '3 Active', color: 'var(--accent-emerald)', icon: <IconCpu size={22} color="var(--accent-emerald)" /> },
                { label: 'Engine', val: 'Aero Engine', color: 'var(--accent-cyan)', icon: <IconSettings size={22} color="var(--accent-cyan)" /> },
                { label: 'Protocol', val: 'J1939', color: 'var(--accent-yellow)', icon: <IconSignal size={22} color="var(--accent-yellow)" /> },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', minWidth: '90px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{s.val}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Mode Cards — 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          {
            id: 'live', icon: <IconLive />, title: 'Live Stream', badge: 'REAL-TIME',
            badgeColor: 'var(--accent-emerald)', glowRgb: GLOW_COLORS.live,
            desc: 'Stream sensor data at 1 Hz from the Aero Engine ECU via SAE J1939 WebSocket. Auto-injects controlled fault scenarios across all 6 zones with live energy field updates.',
            chips: ['WebSocket', '1 Hz', 'Auto-Cycle', 'J1939', 'Zero Setup'],
            action: () => { onStartLive() },
          },
          {
            id: 'upload', icon: <IconFolder />, title: 'Upload Data File', badge: 'CSV / JSON',
            badgeColor: 'var(--accent-yellow)', glowRgb: GLOW_COLORS.upload,
            desc: 'Batch-analyze historical or logged sensor data. Upload a .csv or .json file and each row is independently processed through the 31-feature ML ensemble and digital twins.',
            chips: ['CSV', 'JSON', 'Batch ML', 'Zone Map', 'Export', 'Residuals'],
            action: () => setMode('upload'),
          },
          {
            id: 'synthetic', icon: <IconSimulation />, title: 'Synthetic Simulation', badge: 'GENERATE',
            badgeColor: 'var(--accent-cyan)', glowRgb: GLOW_COLORS.synthetic,
            desc: 'Generate a synthetic test dataset with configurable RPM, fault zone, and severity level. Useful for validating the detection pipeline without real sensor hardware.',
            chips: ['Configurable', 'All Zones', 'Severity Levels', 'No File Needed'],
            action: () => setMode('synthetic'),
          },
          {
            id: 'paste', icon: <IconEdit />, title: 'Manual JSON Entry', badge: 'DIRECT INPUT',
            badgeColor: '#a78bfa', glowRgb: GLOW_COLORS.paste,
            desc: 'Paste raw sensor data as a JSON object or array directly in the browser. Ideal for quick one-off checks without needing to create a file. Supports both single readings and arrays.',
            chips: ['JSON Array', 'Single Object', 'Instant', 'No Upload'],
            action: () => setMode('paste'),
          },
        ].map(card => (
          <div key={card.id}
            onClick={card.action}
            onMouseEnter={() => setHoveredMode(card.id)}
            onMouseLeave={() => setHoveredMode(null)}
            style={{
              padding: '28px', borderRadius: '16px', cursor: 'pointer',
              border: `1.5px solid rgba(${card.glowRgb}, ${hoveredMode === card.id ? 0.6 : 0.2})`,
              background: `rgba(${card.glowRgb}, ${hoveredMode === card.id ? 0.07 : 0.03})`,
              boxShadow: hoveredMode === card.id ? `0 8px 32px rgba(${card.glowRgb},0.2)` : 'none',
              transition: 'all 0.25s ease',
              display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden'
            }}>
            {/* Corner accent */}
            <div style={{
              position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
              background: `radial-gradient(circle at top right, rgba(${card.glowRgb},0.15), transparent 70%)`,
              pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ lineHeight: 1 }}>{card.icon}</div>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 800,
                letterSpacing: '0.5px', textTransform: 'uppercase',
                background: `rgba(${card.glowRgb},0.15)`, color: card.badgeColor,
                border: `1px solid rgba(${card.glowRgb},0.3)`
              }}>{card.badge}</span>
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>{card.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{card.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto' }}>
              {card.chips.map(t => (
                <span key={t} style={{
                  padding: '3px 9px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
                  background: `rgba(${card.glowRgb},0.12)`, color: card.badgeColor,
                  border: `1px solid rgba(${card.glowRgb},0.25)`
                }}>{t}</span>
              ))}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem',
              color: card.badgeColor, fontWeight: 700, marginTop: '4px'
            }}>
              Select Source →
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Config Panel */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconSettings size={18} color="var(--text-primary)" /> Analysis Configuration
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Applied to all analysis modes</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {/* Confidence Threshold */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Confidence Threshold</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {(confThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input type="range" min={0.3} max={0.95} step={0.05} value={confThreshold}
              onChange={e => setConfThreshold(Number(e.target.value))}
              className="level-meter-input"
              style={{ background: `linear-gradient(to right, var(--accent-cyan) ${confThreshold / 0.95 * 100}%, rgba(255,255,255,0.1) 0%)` }} />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Detections below this confidence are suppressed
            </div>
          </div>
          {/* Analysis Speed */}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>Analysis Speed</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['fast', 'Fast'], ['normal', 'Normal'], ['detailed', 'Detailed']].map(([val, label]) => (
                <button key={val} onClick={() => setAnalysisSpeed(val)}
                  style={{
                    flex: 1, padding: '7px 4px', borderRadius: '7px', cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 700,
                    background: analysisSpeed === val ? 'rgba(6,182,212,0.25)' : 'var(--bg-glass)',
                    color: analysisSpeed === val ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: analysisSpeed === val ? '1px solid rgba(6,182,212,0.4)' : '1px solid var(--border-subtle)',
                    transition: 'all 0.15s'
                  }}>{label}</button>
              ))}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {analysisSpeed === 'fast' ? '20ms/row — max throughput' : analysisSpeed === 'normal' ? '50ms/row — balanced' : '120ms/row — full detail'}
            </div>
          </div>
          {/* Leak Only View */}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>Results Filter</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div onClick={() => setLeakOnlyView(!leakOnlyView)} style={{
                  width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer',
                  background: leakOnlyView ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)', position: 'relative', transition: 'all 0.2s', flexShrink: 0
                }}>
                  <div style={{
                    position: 'absolute', top: '2px', left: leakOnlyView ? '18px' : '2px', width: '14px', height: '14px',
                    borderRadius: '50%', background: 'white', transition: 'left 0.2s'
                  }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Show leaks only in results table</span>
              </label>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Healthy rows are hidden from table view
            </div>
          </div>
        </div>
      </div>

      {/* Expected Format Reference */}
      <div className="card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Expected Sensor Columns (CSV / JSON)
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {['RPM', 'MAF', 'MAP_intake', 'MAP_boost', 'MAP_cac_in', 'MAP_cac_out',
            'T_intake', 'T_boost', 'T_cac_out', 'T_exh_manifold', 'T_dpf_in', 'T_dpf_out', 'fuel_qty', 'dP_dpf'].map(col => (
              <span key={col} style={{
                padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)', background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)'
              }}>{col}</span>
            ))}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Missing columns use healthy-state defaults · Extra columns are ignored · Supports .csv, .json, and raw JSON paste
        </div>
      </div>
    </div>
  )

  /* ── SYNTHETIC SIMULATION SCREEN ── */
  if (mode === 'synthetic') return (
    <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button className="demo-btn" onClick={reset} style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconArrowLeft size={14} /> Back
        </button>
        <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconSimulation size={20} /> Synthetic Data Generator
        </h3>
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', marginBottom: '24px' }}>
          {[
            { label: 'Engine RPM', val: synthRPM, set: setSynthRPM, min: 800, max: 2200, step: 100, unit: 'rpm', color: 'var(--accent-cyan)' },
            { label: 'Row Count', val: synthCount, set: setSynthCount, min: 5, max: 200, step: 5, unit: 'rows', color: 'var(--accent-yellow)' },
            { label: 'Fault Zone', val: synthZone, set: setSynthZone, min: 0, max: 6, step: 1, unit: ZONE_NAMES[synthZone].split('—')[0].trim(), color: 'var(--accent-red)' },
            { label: 'Severity Level', val: synthSeverity, set: setSynthSeverity, min: 0, max: 3, step: 1, unit: ['None', 'Small', 'Medium', 'Critical'][synthSeverity], color: 'var(--accent-amber)' },
          ].map(cfg => (
            <div key={cfg.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{cfg.label}</span>
                <span style={{ fontSize: '0.8rem', color: cfg.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cfg.val} {cfg.unit}</span>
              </div>
              <input type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={cfg.val}
                onChange={e => cfg.set(Number(e.target.value))} className="level-meter-input"
                style={{ background: `linear-gradient(to right, ${cfg.color} ${((cfg.val - cfg.min) / (cfg.max - cfg.min) * 100)}%, rgba(255,255,255,0.1) 0%)` }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', marginBottom: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Will generate <b style={{ color: 'var(--accent-cyan)' }}>{synthCount} rows</b> at <b style={{ color: 'var(--accent-cyan)' }}>{synthRPM} RPM</b> —
          ~⅔ with a <b style={{ color: 'var(--accent-yellow)' }}>{ZONE_NAMES[synthZone]}</b> fault at the configured severity, ⅓ healthy baseline.
        </div>
        <button className="demo-btn danger" onClick={runSynthetic}
          style={{ fontWeight: 700, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconZap size={14} color="#fff" /> Generate &amp; Analyze
        </button>
      </div>
      {/* progress + summary appear below */}
      {(isAnalyzing || summary) && <AnalysisResults isAnalyzing={isAnalyzing} progress={progress}
        liveRow={liveRow} parsedRows={parsedRows} results={results} summary={summary}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        sortCol={sortCol} setSortCol={setSortCol} sortDir={sortDir} setSortDir={setSortDir}
        tableRows={tableRows} expandedRow={expandedRow} setExpandedRow={setExpandedRow}
        leakOnlyView={leakOnlyView} exportCSV={exportCSV} cancelRef={cancelRef}
        onCancel={() => { cancelRef.current = true; setIsAnalyzing(false) }}
        onRerun={() => runSynthetic()} onReset={reset} />}
    </div>
  )

  /* ── PASTE JSON SCREEN ── */
  if (mode === 'paste') return (
    <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button className="demo-btn" onClick={reset} style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconArrowLeft size={14} /> Back
        </button>
        <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconEdit size={20} /> Manual JSON Entry
        </h3>
      </div>
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Paste a JSON object <code style={{ color: 'var(--accent-cyan)' }}>{'{ RPM: 1800, MAF: 850, ... }'}</code> or an array <code style={{ color: 'var(--accent-cyan)' }}>{'[{...}, {...}]'}</code>
        </div>
        <textarea
          value={pasteText} onChange={e => setPasteText(e.target.value)}
          placeholder={'[\n  { "RPM": 1800, "MAF": 850, "MAP_boost": 215, "T_cac_out": 45, "T_exh_manifold": 550, "dP_dpf": 0.5 }\n]'}
          style={{
            width: '100%', minHeight: '180px', padding: '14px', borderRadius: '10px',
            background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-medium)',
            color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            caretColor: 'var(--accent-cyan)'
          }} />
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button className="demo-btn danger" onClick={runPaste}
            style={{ fontWeight: 700, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IconPlay size={14} color="#fff" /> Analyze JSON
          </button>
          <button className="demo-btn" onClick={() => setPasteText('')} style={{ fontSize: '0.8rem' }}>Clear</button>
        </div>
      </div>
      {(isAnalyzing || summary) && <AnalysisResults isAnalyzing={isAnalyzing} progress={progress}
        liveRow={liveRow} parsedRows={parsedRows} results={results} summary={summary}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        sortCol={sortCol} setSortCol={setSortCol} sortDir={sortDir} setSortDir={setSortDir}
        tableRows={tableRows} expandedRow={expandedRow} setExpandedRow={setExpandedRow}
        leakOnlyView={leakOnlyView} exportCSV={exportCSV} cancelRef={cancelRef}
        onCancel={() => { cancelRef.current = true; setIsAnalyzing(false) }}
        onRerun={runPaste} onReset={reset} />}
    </div>
  )

  /* ── FILE UPLOAD SCREEN ── */
  return (
    <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button className="demo-btn" onClick={reset} style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconArrowLeft size={14} /> Back
        </button>
        <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconFolder size={20} /> Upload &amp; Analyze
        </h3>
        {file && <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}><IconFile size={16} /> {file.name}</span>}
      </div>

      {!summary && !isAnalyzing && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileDrop(f) }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent-yellow)' : 'var(--border-medium)'}`,
            borderRadius: '16px', padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.01)',
            transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
          }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: dragOver ? 0.04 : 0,
            backgroundImage: 'linear-gradient(45deg, var(--accent-yellow) 25%, transparent 25%, transparent 75%, var(--accent-yellow) 75%)',
            backgroundSize: '8px 8px', transition: 'opacity 0.3s'
          }} />
          <input ref={fileInputRef} type="file" accept=".csv,.json" style={{ display: 'none' }}
            onChange={e => e.target.files[0] && handleFileDrop(e.target.files[0])} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
            <IconCloudUpload size={48} />
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
            {file ? file.name : 'Drop your CSV or JSON file here'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {file
              ? <span style={{ color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconCheck size={14} /> {parsedRows.length} rows ready for analysis</span>
              : 'or click to browse · .csv and .json supported'}
          </div>
          {parseInfo?.error && <div style={{ color: 'var(--accent-red)', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><IconAlert size={14} color="var(--accent-red)" /> {parseInfo.error}</div>}
        </div>
      )}

      {parseInfo && !parseInfo.error && !summary && !isAnalyzing && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              {[{ label: 'ROWS', val: parseInfo.rows, color: 'var(--accent-emerald)' }, { label: 'COLUMNS', val: parseInfo.cols, color: 'var(--accent-cyan)' }].map(k => (
                <div key={k.label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k.label}</div>
                  <div style={{ color: k.color, fontWeight: 800, fontSize: '1.5rem', fontFamily: 'var(--font-mono)' }}>{k.val}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '200px' }}>
              <b style={{ color: 'var(--text-secondary)' }}>Detected: </b>{parseInfo.columns.slice(0, 8).join(' · ')}{parseInfo.columns.length > 8 ? ' …' : ''}
            </div>
            <button className="demo-btn danger" onClick={() => runAnalysis(parsedRows)}
              style={{ whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', border: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconPlay size={14} color="#000" /> Start Analysis
            </button>
          </div>
        </div>
      )}

      {(isAnalyzing || summary) && <AnalysisResults isAnalyzing={isAnalyzing} progress={progress}
        liveRow={liveRow} parsedRows={parsedRows} results={results} summary={summary}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        sortCol={sortCol} setSortCol={setSortCol} sortDir={sortDir} setSortDir={setSortDir}
        tableRows={tableRows} expandedRow={expandedRow} setExpandedRow={setExpandedRow}
        leakOnlyView={leakOnlyView} exportCSV={exportCSV} cancelRef={cancelRef}
        onCancel={() => { cancelRef.current = true; setIsAnalyzing(false) }}
        onRerun={() => runAnalysis(parsedRows)} onReset={reset} />}
    </div>
  )
}

const SortBtn = ({ col, sortCol, sortDir }) => (
  <span style={{ marginLeft: '4px', opacity: 0.5, fontSize: '0.65rem' }}>
    {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
  </span>
)

/* ── Shared Analysis Results panel (used by all modes) ── */
function AnalysisResults({ isAnalyzing, progress, liveRow, parsedRows, summary,
  filterStatus, setFilterStatus, sortCol, setSortCol, sortDir, setSortDir,
  tableRows, expandedRow, setExpandedRow, leakOnlyView, exportCSV,
  onCancel, onRerun, onReset }) {

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Progress */}
      {isAnalyzing && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <IconLoader size={16} color="var(--accent-cyan)" /> Running ML pipeline...
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', fontWeight: 800, fontSize: '1.2rem' }}>{progress}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '14px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`, borderRadius: '8px', transition: 'width 0.3s ease',
              background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-cyan))',
              boxShadow: '0 0 16px rgba(6,182,212,0.5)'
            }} />
          </div>
          {liveRow && (
            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(5,auto)', gap: '20px', fontSize: '0.8rem' }}>
              {[
                { label: 'Row', val: `${liveRow.row_index}/${parsedRows.length}`, color: 'var(--text-primary)' },
                { label: 'Status', val: liveRow.leak_detected ? 'LEAK' : 'Healthy', color: liveRow.leak_detected ? 'var(--accent-red)' : 'var(--accent-emerald)' },
                { label: 'Confidence', val: `${(liveRow.confidence * 100).toFixed(1)}%`, color: 'var(--accent-yellow)' },
                { label: 'Zone', val: liveRow.suspected_zone?.split('—')[0]?.trim() || '-', color: 'var(--accent-cyan)' },
                { label: 'Severity', val: liveRow.severity || '-', color: 'var(--text-secondary)' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ color: item.color, fontWeight: 700 }}>{item.val}</div>
                </div>
              ))}
            </div>
          )}
          <button onClick={onCancel} className="demo-btn" style={{ marginTop: '14px', fontSize: '0.8rem', padding: '6px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IconAlert size={14} color="currentColor" /> Cancel
          </button>
        </div>
      )}

      {/* KPI Strip */}
      {summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
            {[
              { label: 'Total Rows', val: summary.total, color: 'var(--text-primary)', sub: 'processed', icon: <IconClipboard size={22} color="var(--text-primary)" /> },
              { label: 'Leaks Found', val: summary.leaks, color: 'var(--accent-red)', sub: `${summary.leakRate}% rate`, icon: <IconAlert size={22} color="var(--accent-red)" /> },
              { label: 'Healthy', val: summary.healthy, color: 'var(--accent-emerald)', sub: `${(100 - summary.leakRate).toFixed(1)}%`, icon: <IconCheck size={22} color="var(--accent-emerald)" /> },
              { label: 'Avg Confidence', val: `${summary.avgConf}%`, color: 'var(--accent-cyan)', sub: 'all rows', icon: <IconChart size={22} color="var(--accent-cyan)" /> },
              {
                label: 'Primary Zone', val: summary.primary ? summary.primary[0].split('—')[1]?.trim() || 'Zone 1' : 'None',
                color: 'var(--accent-yellow)', sub: summary.primary ? `${summary.primary[1]} events` : 'no leaks', icon: <IconPin size={22} color="var(--accent-yellow)" />
              },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '16px', textAlign: 'center', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', marginBottom: '6px' }}>{k.icon}</div>
                <div style={{ color: k.color, fontSize: '1.7rem', fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{k.val}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 700, margin: '6px 0 2px' }}>{k.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Zone + Severity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="card" style={{ padding: '18px' }}>
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconPin size={16} color="var(--accent-yellow)" /> Zone Distribution
                </span>
              </div>
              {Object.keys(summary.zoneCounts).length === 0
                ? <div style={{ color: 'var(--accent-emerald)', padding: '12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><IconCheck size={16} color="var(--accent-emerald)" /> All rows healthy — no leaks detected</div>
                : ZONE_NAMES.slice(1).map((name, i) => {
                  const count = summary.zoneCounts[name] || 0
                  const pct = summary.leaks ? Math.round(count / summary.leaks * 100) : 0
                  return (
                    <div key={name} style={{ marginBottom: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '5px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Z{i + 1} {name.split('—')[1]?.trim()}</span>
                        <span style={{ color: count > 0 ? 'var(--accent-yellow)' : 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '8px' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`, borderRadius: '4px', transition: 'width 0.7s ease',
                          background: count > 0 ? 'linear-gradient(90deg,var(--accent-yellow),var(--accent-amber))' : 'transparent'
                        }} />
                      </div>
                    </div>
                  )
                })
              }
            </div>
            <div className="card" style={{ padding: '18px' }}>
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconZap size={16} color="var(--accent-cyan)" /> Severity Breakdown
                </span>
              </div>
              {[
                { key: 'CRITICAL', label: 'Critical — >12% flow loss', color: 'var(--accent-red)' },
                { key: 'MEDIUM', label: 'Medium — 8% flow loss', color: '#f97316' },
                { key: 'SMALL', label: 'Small — 2% flow loss', color: 'var(--accent-amber)' },
                { key: 'NONE', label: 'None — Healthy', color: 'var(--accent-emerald)' },
              ].map(s => {
                const count = summary.sevCounts[s.key] || 0
                const pct = summary.total ? Math.round(count / summary.total * 100) : 0
                return (
                  <div key={s.key} style={{ marginBottom: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '5px' }}>
                      <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '8px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: '4px', transition: 'width 0.7s ease', opacity: 0.85 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Worst leak */}
          {summary.worst && (
            <div className="card" style={{ padding: '18px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.03)' }}>
              <div className="card-header" style={{ marginBottom: '14px' }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconAlert size={18} color="var(--accent-red)" /> Highest Confidence Leak — Row #{summary.worst.row_index}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '14px' }}>
                {[
                  { label: 'Zone', val: summary.worst.suspected_zone?.split('—')[1]?.trim() || summary.worst.suspected_zone, color: 'var(--accent-yellow)' },
                  { label: 'Confidence', val: `${(summary.worst.confidence * 100).toFixed(1)}%`, color: 'var(--accent-red)' },
                  { label: 'Severity', val: summary.worst.severity, color: '#f97316' },
                  { label: 'Flow Loss', val: `${summary.worst.flow_loss_pct?.toFixed(1)}%`, color: 'var(--accent-amber)' },
                ].map(k => (
                  <div key={k.label}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
                    <div style={{ color: k.color, fontWeight: 800, fontSize: '1.05rem' }}>{k.val}</div>
                  </div>
                ))}
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--accent-yellow)',
                background: 'rgba(251,191,36,0.05)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <IconWrench size={16} color="var(--accent-yellow)" /> {summary.worst.recommended_action}
              </div>
            </div>
          )}

          {/* Table header controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Row-by-Row Results</span>
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              {[['all', 'All'], ['leak', 'Leaks'], ['ok', 'Healthy']].map(([v, l]) => (
                <button key={v} onClick={() => setFilterStatus(v)}
                  style={{
                    padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                    background: filterStatus === v ? 'rgba(6,182,212,0.25)' : 'var(--bg-glass)',
                    color: filterStatus === v ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: filterStatus === v ? '1px solid rgba(6,182,212,0.4)' : '1px solid var(--border-subtle)'
                  }}>{l}</button>
              ))}
            </div>
            <button onClick={exportCSV} className="demo-btn"
              style={{ fontSize: '0.78rem', padding: '6px 14px', borderColor: 'rgba(52,211,153,0.4)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconDownload size={14} color="var(--accent-emerald)" /> Export CSV
            </button>
          </div>

          {/* Results table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="history-table" style={{ width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                  <tr>
                    <th onClick={() => toggleSort('row_index')} style={{ cursor: 'pointer' }}>Row<SortBtn col="row_index" sortCol={sortCol} sortDir={sortDir} /></th>
                    <th>Status</th>
                    <th onClick={() => toggleSort('confidence')} style={{ cursor: 'pointer' }}>Confidence<SortBtn col="confidence" sortCol={sortCol} sortDir={sortDir} /></th>
                    <th>Zone</th>
                    <th onClick={() => toggleSort('severity')} style={{ cursor: 'pointer' }}>Severity<SortBtn col="severity" sortCol={sortCol} sortDir={sortDir} /></th>
                    <th onClick={() => toggleSort('flow_loss_pct')} style={{ cursor: 'pointer' }}>Flow Loss<SortBtn col="flow_loss_pct" sortCol={sortCol} sortDir={sortDir} /></th>
                    <th>GO/NO-GO</th>
                    <th>▼</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <React.Fragment key={i}>
                      <tr style={{ cursor: 'pointer', opacity: (leakOnlyView && !r.leak_detected) ? 0.4 : 1 }}
                        onClick={() => setExpandedRow(expandedRow === r.row_index ? null : r.row_index)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{r.row_index}</td>
                        <td style={{ color: r.error ? 'var(--accent-amber)' : r.leak_detected ? 'var(--accent-red)' : 'var(--accent-emerald)', fontWeight: 700 }}>
                          <span className={`status-dot ${r.leak_detected ? 'leak' : 'healthy'}`}></span>
                          {r.error ? 'ERR' : r.leak_detected ? 'LEAK' : 'OK'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '48px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${(r.confidence || 0) * 100}%`,
                                background: r.confidence > 0.7 ? 'var(--accent-red)' : r.confidence > 0.4 ? 'var(--accent-yellow)' : 'var(--accent-emerald)',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                              {r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{r.suspected_zone?.split('—')[0]?.trim() || '—'}</td>
                        <td>{r.severity ? <span className={`alert-severity severity-${r.severity?.toLowerCase()}`}>{r.severity}</span> : '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{r.flow_loss_pct != null ? `${r.flow_loss_pct?.toFixed(1)}%` : '—'}</td>
                        <td style={{ color: r.go_no_go === 'GO' ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 700 }}>{r.go_no_go || '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{expandedRow === r.row_index ? '▲' : '▼'}</td>
                      </tr>
                      {expandedRow === r.row_index && (
                        <tr key={`exp-${i}`}>
                          <td colSpan={8} style={{ padding: '14px 18px', background: 'rgba(6,182,212,0.04)', borderLeft: '3px solid var(--accent-cyan)' }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '8px' }}>Digital Twin Residuals</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                              {Object.entries(r.residuals || {}).map(([k, v]) => (
                                <div key={k} style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{k.replace('res_', '')} </span>
                                  <span style={{ color: Math.abs(v) > 10 ? 'var(--accent-red)' : 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v?.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            {r.recommended_action && (
                              <div style={{ padding: '8px 12px', borderLeft: '3px solid var(--accent-yellow)', background: 'rgba(251,191,36,0.05)', borderRadius: '0 6px 6px 0', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <IconWrench size={16} color="var(--accent-yellow)" /> {r.recommended_action}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="demo-btn" onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconArrowLeft size={14} /> New Analysis
            </button>
            <button className="demo-btn danger" onClick={onRerun} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconRefresh size={14} /> Re-run
            </button>
            <button onClick={exportCSV} className="demo-btn"
              style={{ borderColor: 'rgba(52,211,153,0.4)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconDownload size={14} color="var(--accent-emerald)" /> Export CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Batch Scrubber and Timeline Component ──────────────────────────
// eslint-disable-next-line no-unused-vars
function BatchScrubber({
  batchResults,
  selectedRowIndex,
  setSelectedRowIndex,
  setPredictionData,
  isAnalyzing,
  confThreshold
}) {
  const svgRef = useRef(null)
  const total = batchResults.length
  if (total === 0) return null

  const activeIdx = selectedRowIndex !== null ? selectedRowIndex : total - 1
  const currentRow = batchResults[activeIdx]

  if (!currentRow) return null

  const handlePrev = () => {
    if (activeIdx > 0) {
      const nextIdx = activeIdx - 1
      setSelectedRowIndex(nextIdx)
      setPredictionData(batchResults[nextIdx])
    }
  }

  const handleNext = () => {
    if (activeIdx < total - 1) {
      const nextIdx = activeIdx + 1
      setSelectedRowIndex(nextIdx)
      setPredictionData(batchResults[nextIdx])
    }
  }

  const handleSliderChange = (e) => {
    const nextIdx = Number(e.target.value)
    setSelectedRowIndex(nextIdx)
    setPredictionData(batchResults[nextIdx])
  }

  // SVG Chart layout calculations
  const width = 800
  const height = 140
  const paddingLeft = 45
  const paddingRight = 20
  const paddingTop = 15
  const paddingBottom = 25

  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  // Generate coordinates for the SVG path
  const points = batchResults.map((r, i) => {
    const x = paddingLeft + (total > 1 ? (i / (total - 1)) * chartWidth : chartWidth / 2)
    const y = paddingTop + chartHeight - ((r.confidence || 0) * chartHeight)
    return { x, y, row: r, index: i }
  })

  // Construct line and area path commands
  let linePath = ''
  let areaPath = ''

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    areaPath = `M ${points[0].x} ${paddingTop + chartHeight} ` +
      points.map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`
  }

  // Handle interactive clicks on the SVG
  const handleSvgClick = (e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    // calculate mouse x relative to the svg element
    const clickX = ((e.clientX - rect.left) / rect.width) * width - paddingLeft
    const pct = clickX / chartWidth
    let idx = Math.round(pct * (total - 1))
    idx = Math.max(0, Math.min(total - 1, idx))
    setSelectedRowIndex(idx)
    setPredictionData(batchResults[idx])
  }

  // Threshold line height
  const thresholdY = paddingTop + chartHeight - (confThreshold * chartHeight)

  return (
    <div className="card batch-scrubber-card" style={{ gridColumn: '1 / -1', padding: '22px', border: '1px solid rgba(251, 191, 36, 0.3)', background: 'rgba(15, 15, 25, 0.85)', marginBottom: '20px' }}>

      {/* Scrub Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
        <button
          onClick={handlePrev}
          disabled={activeIdx === 0 || isAnalyzing}
          className="demo-btn"
          style={{ padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ◀ Prev
        </button>

        <input
          type="range"
          min={0}
          max={total - 1}
          value={activeIdx}
          onChange={handleSliderChange}
          disabled={isAnalyzing || total <= 1}
          className="level-meter-input"
          style={{
            flex: 1,
            background: `linear-gradient(to right, var(--accent-yellow) ${(activeIdx / (total - 1 || 1)) * 100}%, rgba(255,255,255,0.08) 0%)`
          }}
        />

        <button
          onClick={handleNext}
          disabled={activeIdx === total - 1 || isAnalyzing}
          className="demo-btn"
          style={{ padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Next ▶
        </button>
      </div>

      {/* SVG Interactive Chart */}
      <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          onClick={handleSvgClick}
          style={{ width: '100%', height: 'auto', cursor: 'crosshair', display: 'block' }}
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-yellow)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--accent-yellow)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent-cyan)" />
              <stop offset="50%" stopColor="var(--accent-yellow)" />
              <stop offset="100%" stopColor="var(--accent-red)" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="rgba(255,255,255,0.1)" />

          {/* Y Axis labels */}
          <text x={paddingLeft - 10} y={paddingTop + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">100%</text>
          <text x={paddingLeft - 10} y={paddingTop + chartHeight / 2 + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">50%</text>
          <text x={paddingLeft - 10} y={paddingTop + chartHeight + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">0%</text>

          {/* X Axis labels (first and last row index) */}
          <text x={paddingLeft} y={height - 5} fill="var(--text-muted)" fontSize="9" textAnchor="start" fontFamily="var(--font-mono)">Row #1</text>
          <text x={width - paddingRight} y={height - 5} fill="var(--text-muted)" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">Row #{total}</text>

          {/* Leak Threshold Reference Line */}
          <line
            x1={paddingLeft}
            y1={thresholdY}
            x2={width - paddingRight}
            y2={thresholdY}
            stroke="var(--accent-red)"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.6"
          />
          <text x={width - paddingRight - 5} y={thresholdY - 4} fill="var(--accent-red)" fontSize="8" textAnchor="end" opacity="0.8">
            Threshold ({(confThreshold * 100).toFixed(0)}%)
          </text>

          {/* Area under the curve */}
          {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

          {/* Sparkline */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover / Selected reticle line */}
          {points[activeIdx] && (
            <line
              x1={points[activeIdx].x}
              y1={paddingTop}
              x2={points[activeIdx].x}
              y2={paddingTop + chartHeight}
              stroke="var(--accent-yellow)"
              strokeWidth="1.5"
              strokeDasharray="2,2"
            />
          )}

          {/* Anomalous points (Confidence > threshold) marked with glowing red dots */}
          {points.map((p, i) => {
            if ((p.row.confidence || 0) > confThreshold) {
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="var(--accent-red)"
                  stroke="#12121a"
                  strokeWidth="1"
                  style={{ filter: 'drop-shadow(0px 0px 3px var(--accent-red))' }}
                />
              )
            }
            return null
          })}

          {/* Active point indicator */}
          {points[activeIdx] && (
            <g>
              <circle
                cx={points[activeIdx].x}
                cy={points[activeIdx].y}
                r="7"
                fill="var(--accent-yellow)"
                opacity="0.3"
              />
              <circle
                cx={points[activeIdx].x}
                cy={points[activeIdx].y}
                r="4.5"
                fill="var(--accent-yellow)"
                stroke="#12121a"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────
// Initialize sessionId
if (typeof window !== 'undefined' && !window.sessionId) {
  window.sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
}

function App() {
  const [showIntro, setShowIntro] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed)
  }, [isSidebarCollapsed])

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme')
    } else {
      document.body.classList.remove('light-theme')
    }
    localStorage.setItem('theme', theme)
  }, [theme])
  const [predictionData, setPredictionData] = useState(null)
  const [history, setHistory] = useState([])
  const [batchStatus, setBatchStatus] = useState(null)
  const [batchResults, setBatchResults] = useState([])
  const [, setSelectedBatchRowIndex] = useState(null)
  const [confThreshold, setConfThreshold] = useState(0.5)
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [isIdle, setIsIdle] = useState(true)  // true = initial idle state, show all-green zeros
  const [simZone, setSimZone] = useState(0)
  const [simSeverity, setSimSeverity] = useState(0)
  const [manualSensors, setManualSensors] = useState({
    RPM: 1800, MAF: 850, MAP_boost: 215, T_cac_out: 45, T_exh_manifold: 550, dP_dpf: 0.5, fuel_qty: 120
  })
  const wsRef = useRef(null)
  const demoWsRef = useRef(null)
  const debounceRef = useRef(null)

  const [daqStatus, setDaqStatus] = useState('Disconnected')
  const isConnected = daqStatus === 'Connected' || isDemoRunning;

  // Fetch current DAQ status on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/dax/daq/status`)
      .then(res => res.json())
      .then(data => {
        setDaqStatus(data.status);
      })
      .catch(err => console.error('Error fetching DAQ status:', err));
  }, []);

  // Globally stream real-time DAQ packets into prediction state
  useEffect(() => {
    let ws = null;
    const connectDAQ = () => {
      ws = new WebSocket(`${WS_BASE}/ws/daq`);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'daq_packet') {
          setDaqStatus(msg.status);

          if (msg.status === 'Connected') {
            const isLeak = msg.packet.LeakZone > 0;
            const mappedPrediction = {
              leak_detected: isLeak,
              confidence: msg.ai_prediction.leak_risk,
              suspected_zone: isLeak ? ZONE_NAMES[msg.packet.LeakZone] : ZONE_NAMES[0],
              suspected_zone_idx: msg.packet.LeakZone,
              zone_probabilities: [
                msg.packet.LeakZone === 0 ? 1.0 : 0.05,
                msg.packet.LeakZone === 1 ? 0.90 : 0.01,
                msg.packet.LeakZone === 2 ? 0.90 : 0.01,
                msg.packet.LeakZone === 3 ? 0.90 : 0.01,
                msg.packet.LeakZone === 4 ? 0.90 : 0.01,
                msg.packet.LeakZone === 5 ? 0.90 : 0.01,
                msg.packet.LeakZone === 6 ? 0.90 : 0.01,
              ],
              severity: isLeak ? (msg.ai_prediction.leak_risk > 0.8 ? "CRITICAL" : msg.ai_prediction.leak_risk > 0.5 ? "MEDIUM" : "SMALL") : "NONE",
              flow_loss_pct: isLeak ? (msg.ai_prediction.leak_risk * 15.0) : 0.0,
              go_no_go: isLeak ? "NO-GO" : "GO",
              recommended_action: isLeak ? `DAQ Stream Alert: Inspect Zone ${msg.packet.LeakZone}` : "System operating within normal parameters.",
              residuals: {
                res_MAF: 0.0,
                res_MAP_boost: 0.0,
                res_T_boost: 0.0,
                res_T_cac_out: 0.0,
                res_MAP_cac_out: 0.0,
                res_T_exh_manifold: 0.0,
                res_T_post_turbine: 0.0,
                res_dP_dpf: 0.0,
                res_MAP_intake: 0.0
              },
              sensors: {
                RPM: msg.packet.RPM,
                MAF: msg.packet.MAF,
                MAP_intake: msg.packet.OilPressure * 0.6,
                MAP_boost: msg.packet.Boost,
                MAP_cac_in: msg.packet.Boost * 0.98,
                MAP_cac_out: msg.packet.Boost * 0.95,
                T_intake: 25.0,
                T_boost: msg.packet.OilTemp * 1.3,
                T_cac_out: msg.packet.CoolantTemp * 0.5,
                T_exh_manifold: msg.packet.OilTemp * 6.0,
                T_dpf_in: msg.packet.OilTemp * 2.7,
                T_dpf_out: msg.packet.OilTemp * 2.2,
                fuel_qty: msg.packet.ThrottlePosition * 1.8,
                dP_dpf: 0.5
              },
              energy_field: {
                matrix: Array(6).fill(null).map((_, i) =>
                  Array(6).fill(null).map((_, j) => i === j ? 1.0 : 0.8 - Math.abs(i - j) * 0.1)
                ),
                global_deviation: isLeak ? 4.2 : 0.3,
                cosine_similarity: isLeak ? 0.82 : 0.98,
                most_disrupted_sensor: isLeak ? "MAP_boost" : "N/A",
                ef_suspected_zone: isLeak ? ZONE_NAMES[msg.packet.LeakZone] : "N/A"
              }
            };
            setPredictionData(mappedPrediction);

            setManualSensors({
              RPM: msg.packet.RPM,
              MAF: msg.packet.MAF,
              MAP_boost: msg.packet.Boost,
              T_cac_out: msg.packet.CoolantTemp * 0.5,
              T_exh_manifold: msg.packet.OilTemp * 6.0,
              dP_dpf: 0.5,
              fuel_qty: msg.packet.ThrottlePosition * 1.8
            });

            setHistory(prev => [...prev.slice(-100), mappedPrediction]);
          }
        }
      };
      ws.onclose = () => {
        setDaqStatus('Disconnected');
        setTimeout(connectDAQ, 3000);
      };
    };

    connectDAQ();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Acoustic states
  const [audioFiles, setAudioFiles] = useState({ good: [], leak: [] })
  const [selectedCategory, setSelectedCategory] = useState('good')
  const [selectedFile, setSelectedFile] = useState('')
  const [acousticResult, setAcousticResult] = useState(null)
  const [isAcousticLoading, setIsAcousticLoading] = useState(false)

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    const files = audioFiles[cat] || [];
    if (files.length > 0) {
      setSelectedFile(files[0]);
    } else {
      setSelectedFile('');
    }
    setAcousticResult(null);
  };

  const analyzeSound = async () => {
    if (!selectedFile) return;
    setIsAcousticLoading(true);
    setAcousticResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/audio/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          filename: selectedFile,
          sensors: manualSensors,
          session_id: window.sessionId,
        }),
      });
      const result = await res.json();

      // Update states with the real unified prediction from the backend
      setAcousticResult(result.acoustic_analysis);
      setPredictionData(result);
      setHistory(prev => [...prev.slice(-100), result]);

    } catch (err) {
      console.error('Error analyzing sound:', err);
    } finally {
      setIsAcousticLoading(false);
    }
  };

  // Fetch audio files list on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/audio/files`)
      .then(res => res.json())
      .then(data => {
        if (data && (data.good || data.leak)) {
          setAudioFiles(data)
          if (data.good && data.good.length > 0) {
            setSelectedFile(data.good[0])
          }
        }
      })
      .catch(err => console.error('Error fetching audio files:', err))
  }, [])

  const handleManualSensorChange = (newSensors) => {
    setIsIdle(false);  // User interacted — leave idle mode
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newSensors, session_id: window.sessionId }),
        })
        const data = await res.json()
        setPredictionData(data)
        setHistory(prev => [...prev.slice(-100), data])
      } catch (err) {
        console.error('Manual prediction error:', err)
      }
    }, 100);
  };

  const handleZoneClick = (zoneId) => {
    if (isDemoRunning) {
      stopDemo();
    }
    setIsIdle(false);  // User interacted — leave idle mode
    setSimZone(zoneId);
    setSimSeverity(2); // Default to Medium (8%) leak on click
  };

  // Fetch history on load
  useEffect(() => {
    fetch(`${API_BASE}/api/history?limit=50`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data)
      })
      .catch(() => { })
  }, [])

  // Demo WebSocket
  const startDemo = useCallback(() => {
    setIsIdle(false);  // User started demo — leave idle mode
    if (demoWsRef.current) {
      demoWsRef.current.close()
    }
    const ws = new WebSocket(`${WS_BASE}/ws/demo`)
    ws.onopen = () => {
      setIsDemoRunning(true)
      // Send initial overrides immediately if they were selected
      ws.send(JSON.stringify({
        leak_zone: simZone,
        leak_severity: simSeverity,
        session_id: window.sessionId
      }))
    }
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setPredictionData(data)
      setHistory(prev => [...prev.slice(-100), data])

      if (data.sensors) {
        setManualSensors({
          RPM: data.sensors.RPM || 1800,
          MAF: data.sensors.MAF || 850,
          MAP_boost: data.sensors.MAP_boost || 215,
          T_cac_out: data.sensors.T_cac_out || 45,
          T_exh_manifold: data.sensors.T_exh_manifold || 550,
          dP_dpf: data.sensors.dP_dpf || 0.5,
          fuel_qty: data.sensors.fuel_qty || 120
        })
      }
    }
    ws.onclose = () => {
      setIsDemoRunning(false)
    }
    ws.onerror = () => {
      setIsDemoRunning(false)
    }
    demoWsRef.current = ws
  }, [simZone, simSeverity])

  const stopDemo = useCallback(() => {
    if (demoWsRef.current) {
      demoWsRef.current.close()
      demoWsRef.current = null
    }
    setIsDemoRunning(false)
  }, [])

  // Manual simulation
  const runSimulation = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rpm: 1800,
          leak_zone: simZone,
          leak_severity: simSeverity,
          session_id: window.sessionId,
        }),
      })
      const data = await res.json()
      setPredictionData(data)
      if (data.sensors) {
        setManualSensors(data.sensors)
      }
      setHistory(prev => [...prev.slice(-100), data])
    } catch (err) {
      console.error('Simulation error:', err)
    }
  }, [simZone, simSeverity])

  // Auto-run simulation or update running demo when selection changes
  // But only if the user has already left idle (i.e. taken an action)
  useEffect(() => {
    if (isIdle) return;  // Don't auto-fire on mount — wait for user action
    if (isDemoRunning) {
      if (demoWsRef.current && demoWsRef.current.readyState === WebSocket.OPEN) {
        demoWsRef.current.send(JSON.stringify({
          leak_zone: simZone,
          leak_severity: simSeverity,
          session_id: window.sessionId
        }))
      }
    } else if (daqStatus !== 'Connected') {
      runSimulation()
    }
  }, [simZone, simSeverity, isDemoRunning, runSimulation, daqStatus, isIdle])

  // Disable page scroll when viewing the digital twin to prevent page-shift during 3D orbit/zoom
  useEffect(() => {
    if (location.pathname === '/digital-twin') {
      document.body.style.overflow = 'hidden';
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.height = '100vh';
        mainContent.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.height = '';
        mainContent.style.overflow = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.height = '';
        mainContent.style.overflow = '';
      }
    };
  }, [location.pathname])

  // Cleanup on unmount
  useEffect(() => {
    const ws = wsRef.current
    const demoWs = demoWsRef.current
    return () => {
      if (demoWs) demoWs.close()
      if (ws) ws.close()
    }
  }, [])

  // Idle state: all zeros, full green, GO — shown until user takes an action
  const IDLE_DATA = {
    leak_detected: false,
    confidence: 0,
    suspected_zone: ZONE_NAMES[0],
    suspected_zone_idx: 0,
    zone_probabilities: [1, 0, 0, 0, 0, 0, 0],
    severity: 'NONE',
    flow_loss_pct: 0,
    go_no_go: 'GO',
    recommended_action: 'Press \u25B6 Start Live Demo or use the controls below to begin monitoring.',
    residuals: {
      res_MAF: 0, res_MAP_boost: 0, res_T_boost: 0, res_T_cac_out: 0,
      res_MAP_cac_out: 0, res_T_exh_manifold: 0, res_T_post_turbine: 0,
      res_dP_dpf: 0, res_MAP_intake: 0
    },
    // All-zero matrix renders as all-green in the heatmap (getColor(0) = '#316237')
    energy_field: {
      matrix: Array(6).fill(null).map(() => Array(6).fill(0)),
      global_deviation: 0,
      cosine_similarity: 1,
      most_disrupted_sensor: 'N/A'
    },
    sensors: {
      RPM: 0, MAF: 0, MAP_intake: 0, MAP_boost: 0, MAP_cac_in: 0, MAP_cac_out: 0,
      T_intake: 0, T_boost: 0, T_cac_out: 0, T_exh_manifold: 0,
      T_dpf_in: 0, T_dpf_out: 0, fuel_qty: 0, dP_dpf: 0
    },
  }

  const data = isIdle ? IDLE_DATA : (predictionData || {
    leak_detected: false,
    confidence: 0,
    suspected_zone: ZONE_NAMES[0],
    suspected_zone_idx: 0,
    zone_probabilities: [1, 0, 0, 0, 0, 0, 0],
    severity: 'NONE',
    flow_loss_pct: 0,
    go_no_go: 'GO',
    recommended_action: 'Connecting to backend...',
    residuals: {},
    energy_field: { matrix: Array(6).fill(null).map(() => Array(6).fill(0)), global_deviation: 0, cosine_similarity: 1, most_disrupted_sensor: 'N/A' },
    sensors: {},
  })

  return (
    <>
      {showIntro && <IntroVideo onComplete={() => setShowIntro(false)} />}
      <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          isConnected={isConnected}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(prev => !prev)}
        />

        <main className="main-content">
          <div className="main-header">
            <h2>
              {(location.pathname === '/dashboard' || location.pathname === '/') && 'Real-Time Dashboard'}
              {location.pathname === '/engine' && 'Analysis'}
              {location.pathname === '/history' && 'Detection History'}
              {location.pathname === '/dax' && 'Sensor Hub'}
              {location.pathname === '/digital-twin' && 'Digital Twin'}
              {location.pathname === '/upload' && 'Upload & Check'}
            </h2>
            <div className="header-controls">
              <span className={`header-badge ${isConnected ? 'badge-connected' : 'badge-disconnected'}`}>
                <span className="status-dot" style={{
                  background: isConnected ? 'var(--accent-emerald)' : 'var(--accent-red)',
                  width: '6px', height: '6px'
                }}></span>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="theme-toggle-btn"
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          {/* Demo Controls — visible on Dashboard page only */}
          {(location.pathname === '/dashboard' || location.pathname === '/') && (
            <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
              <div className="demo-controls">
                <button
                  id="demo-toggle"
                  className={`demo-btn ${isDemoRunning ? 'active' : ''}`}
                  onClick={isDemoRunning ? stopDemo : startDemo}
                >
                  {isDemoRunning ? 'Stop Demo' : 'Start Live Demo'}
                </button>

                <select className="demo-select" value={simZone} onChange={e => {
                  const zone = Number(e.target.value);
                  setSimZone(zone);
                  setIsIdle(false);  // immediately exit idle & reflect in dashboard
                }}>
                  <option value={0}>Healthy (No Leak)</option>
                  <option value={1}>Zone 1 — Intake</option>
                  <option value={2}>Zone 2 — Charge Air</option>
                  <option value={3}>Zone 3 — CAC/Manifold</option>
                  <option value={4}>Zone 4 — Exhaust</option>
                  <option value={5}>Zone 5 — DPF</option>
                  <option value={6}>Zone 6 — SCR/Tailpipe</option>
                </select>

                <select className="demo-select" value={simSeverity} onChange={e => {
                  const sev = Number(e.target.value);
                  setSimSeverity(sev);
                  setIsIdle(false);  // immediately exit idle & reflect in dashboard
                }}>
                  <option value={0}>No Fault</option>
                  <option value={1}>Small (2%)</option>
                  <option value={2}>Medium (8%)</option>
                  <option value={3}>Large (15%)</option>
                </select>

                <button id="simulate-btn" className="demo-btn danger" onClick={() => { setIsIdle(false); runSimulation(); }}>
                  Inject & Predict
                </button>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard Page */}
            <Route path="/dashboard" element={
              <div className="dashboard-grid">
                {batchStatus && batchStatus.isAnalyzing && (
                  <div className="card" style={{ gridColumn: '1 / -1', padding: '16px 20px', background: 'rgba(252, 212, 65, 0.05)', border: '1.5px solid var(--border-medium)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-yellow)' }}>
                        Batch Analyzing: Processing Telemetry Row #{batchStatus.current} of {batchStatus.total}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-yellow)', fontSize: '1rem' }}>
                        {batchStatus.progress}%
                      </span>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${batchStatus.progress}%`, background: 'var(--accent-yellow)', transition: 'width 0.1s ease' }} />
                    </div>
                  </div>
                )}
                {batchStatus && !batchStatus.isAnalyzing && batchStatus.summary && (
                  <div className="card" style={{ gridColumn: '1 / -1', padding: '18px 22px', border: '1.5px solid var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--accent-emerald)', fontSize: '1.05rem', fontWeight: 800 }}>✓ Batch Analysis Complete</h4>
                        <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Processed <strong>{batchStatus.total} rows</strong>. Found <strong>{batchStatus.summary.leaks} anomalies</strong> ({batchStatus.summary.leakRate}% leak rate). Average confidence: <strong>{batchStatus.summary.avgConf}%</strong>.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="demo-btn" onClick={() => { navigate('/upload'); }} style={{ fontSize: '0.78rem', borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)', padding: '6px 12px' }}>
                          Inspect Detailed Table
                        </button>
                        <button className="demo-btn" onClick={() => setBatchStatus(null)} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <GoNoGoIndicator status={data.go_no_go} confidence={data.confidence} />
                <ConfidenceRing confidence={data.confidence} leakDetected={data.leak_detected} zoneId={data.suspected_zone_idx} />
                <LeakAlertCard data={data} />

                <SensorGrid sensors={data.sensors} />
                <EnergyFieldHeatmap efData={data.energy_field} />

                <ResidualsCard residuals={data.residuals} />
                <ZoneProbabilities probs={data.zone_probabilities} data={data} />
              </div>
            } />

            {/* Engine Diagram Page */}
            <Route path="/engine" element={
              <div className="dashboard-grid">
                <InteractiveLevelMeters
                  sensors={manualSensors}
                  setSensors={setManualSensors}
                  onSensorChange={handleManualSensorChange}
                />
                <AcousticLeakDetector
                  audioFiles={audioFiles}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  handleCategoryChange={handleCategoryChange}
                  analyzeSound={analyzeSound}
                  acousticResult={acousticResult}
                  isLoading={isAcousticLoading}
                />
                <EngineDiagram
                  zoneIdx={data.suspected_zone_idx}
                  leakDetected={data.leak_detected}
                  onZoneClick={handleZoneClick}
                />
                <GoNoGoIndicator status={data.go_no_go} confidence={data.confidence} />
                <ConfidenceRing confidence={data.confidence} leakDetected={data.leak_detected} zoneId={data.suspected_zone_idx} />
                <EnergyFieldGraph efData={data.energy_field} />
                <LeakAlertCard data={data} />
                <ZoneProbabilities probs={data.zone_probabilities} data={data} />
              </div>
            } />

            {/* History Page */}
            <Route path="/history" element={
              <div className="dashboard-grid">
                <HistoryTable history={history} />
              </div>
            } />

            {/* Sensor Intelligence Hub Page */}
            <Route path="/dax" element={
              <div className="dashboard-grid">
                <DAXConsole />
              </div>
            } />

            {/* Digital Twin Page */}
            <Route path="/digital-twin" element={
              <div style={{ width: '100%', height: 'calc(100vh - 80px)', padding: '0', margin: '0', overflow: 'hidden' }}>
                <DigitalTwinViewer />
              </div>
            } />

            {/* Upload & Check Page */}
            <Route path="/upload" element={
              <div className="dashboard-grid">
                <UploadCheckPage
                  onStartLive={() => {
                    navigate('/dashboard')
                    startDemo()
                  }}
                  setPredictionData={setPredictionData}
                  setHistory={setHistory}
                  setBatchStatus={setBatchStatus}
                  results={batchResults}
                  setResults={setBatchResults}
                  setSelectedBatchRowIndex={setSelectedBatchRowIndex}
                  confThreshold={confThreshold}
                  setConfThreshold={setConfThreshold}
                  setIsIdle={setIsIdle}
                />
              </div>
            } />

            {/* Test GLB Route */}
            <Route path="/test-glb" element={<TestGLB />} />
          </Routes>
        </main>
        <ChatBot />
      </div>
    </>
  )
}

export default App
