# SKILL.md — AeroTwin Development Alignment Skill

> **Purpose:** This skill file is the single source of truth that keeps any AI coding agent (Antigravity, Claude Code, etc.) working on this repository aligned to **SIH 2026 Problem Statement 26054 (DRDO)**. Load/consult this file before implementing, refactoring, or reviewing ANY feature. If a task conflicts with anything here, the task must be flagged, not silently completed.

---

## 1. Project Identity

- **Project Name:** AeroTwin
- **Full Title:** AeroTwin — An AI-Enabled Digital Twin Framework for Real-Time Health Monitoring, Fault Prediction, and Mission Reliability Enhancement of Aero Piston Engines in MALE UAVs
- **Problem Statement ID:** 26054 (DRDO / Department of Defence Production, IDEX)
- **Category:** Software | **Theme:** Robotics and Drones
- **Core Concept:** A **Residual-Driven, Physics-Informed Digital Twin** — the twin predicts *expected* engine sensor behavior from a thermodynamic/energy model; the ML layer operates on the **residual** (actual − predicted), not raw sensor values.

---

## 2. Non-Negotiable Scope Anchors

Every feature built MUST map to one of these six blocks. If a proposed feature doesn't map to any of them, it is scope creep — flag it, don't build it silently.

| Block | Must Include |
|---|---|
| **A. Digital Twin Core** | Physics-informed engine model, real-time sync, modular architecture |
| **B. Health Monitoring** | RPM, CHT, EGT, Oil Pressure/Temp, Fuel Flow, Vibration, Battery/Alternator, Injection Timing |
| **C. Fault Detection** | Misfire, injector abnormality, cooling degradation, lubrication issues, sensor drift, combustion instability, overheating, abnormal vibration |
| **D. AI/ML Layer** | Anomaly detection, RUL estimation, trend analysis, maintenance recommendations |
| **E. Simulation & Replay** | Historical mission replay, environmental what-if simulation (altitude, endurance, hot-weather, rapid throttle) |
| **F. Dashboard/HMI** | Live health status, fault alerts, efficiency trends, maintenance advisory, mission-wise reports |

**Rule:** Before marking any module "done," check it against this table.

---

## 3. Architecture Invariant (Do Not Violate)

The residual-based design is the project's core innovation. Any implementation MUST preserve this data path:

```
Raw Sensor/Simulated Telemetry
        ↓
Physics-Informed Engine Model → Predicted Value
        ↓
Residual = Actual − Predicted   ← ML NEVER bypasses this step
        ↓
ML Layer (Anomaly Detection → Fault Classification → RUL)
        ↓
Explainability Layer (which parameter/residual triggered it)
        ↓
Dashboard / 3D Twin / Alerts
```

**Guardrail:** If an agent implements anomaly detection directly on raw sensor values without computing the residual first, this is an architecture violation — stop and correct it.

---

## 4. Tech Stack Contract (Fixed — Do Not Substitute Without Explicit Approval)

| Layer | Technology |
|---|---|
| Frontend | **React.js** (Vite), TailwindCSS, Recharts/D3 for 2D charts |
| 3D Digital Twin Visualization | **Three.js** via **React Three Fiber** + `@react-three/drei` |
| Real-time transport | WebSocket (native FastAPI WS or Socket.IO) |
| Backend / API | **Python (FastAPI)** + Uvicorn |
| ML / Physics Engine | **Python** — NumPy/SciPy (physics model), PyTorch or Scikit-learn (ML: anomaly detection, classification, RUL) |
| Explainability | SHAP or residual-attribution logic |
| Data storage | SQLite (hackathon-scale) → TimescaleDB/InfluxDB (production path) |
| Simulation Data Source | Python physics-based synthetic telemetry generator (since no real DRDO dataset is available) |
| Containerization | Docker + Docker Compose |

**Rule:** No new frameworks/languages introduced without updating this file first.

---

## 5. Repository Structure Contract

```
aerosense/
├── frontend/                 # React + Vite + R3F
│   ├── src/
│   │   ├── components/       # Dashboard widgets, alerts, panels
│   │   ├── three/            # 3D twin scene, engine mesh, material logic
│   │   ├── hooks/             # useTelemetrySocket, useReplay
│   │   └── state/             # Zustand/Redux store for live telemetry
├── backend/
│   ├── api/                  # FastAPI routes (REST)
│   ├── ws/                   # WebSocket handlers
│   ├── physics/               # Thermodynamic engine model, energy field generator
│   ├── ml/                   # Anomaly detection, fault classifier, RUL model
│   ├── simulator/            # Synthetic telemetry + fault-injection generator
│   └── db/                    # Schemas, migrations
├── docs/
│   ├── SKILL.md
│   ├── MasterPrompt.md
│   └── workflow.md
└── docker-compose.yml
```

---

## 6. Coding & Naming Conventions

- Telemetry field names must match Section B exactly: `rpm, cht, egt, oil_pressure, oil_temp, fuel_flow, vibration, battery_voltage, injection_timing`
- Every fault class must use these exact identifiers: `misfire, injector_abnormality, cooling_degradation, lubrication_issue, sensor_drift, combustion_instability, overheating, abnormal_vibration`
- All ML modules must expose a residual-vector input contract, not raw-value input
- Frontend components must separate **live mode** and **replay mode** cleanly (shared components, different data source)

---

## 7. Definition of Done (per module)

A module is only "done" when:
1. It maps to a block in Section 2
2. It respects the architecture invariant in Section 3
3. It uses only the approved tech stack (Section 4)
4. It has a working demo path using simulated data (no real engine data required)
5. It is explainable — any alert/output can show *why* (which residual/parameter)

---

## 8. Anti-Scope-Creep Rules

- Do NOT build features unrelated to engine health/fault/RUL/simulation/dashboard (e.g., no flight-path navigation, no payload management — that's a different UAV subsystem)
- Do NOT replace the residual-based architecture with a simpler black-box classifier for "speed" — explainability is a judged requirement
- Do NOT hardcode fake "real DRDO data" — always label data as simulated/synthetic in the UI and docs

---

## 9. Validation Checklist Before Any Merge/Demo

- [ ] Does this feature map to blocks A–F?
- [ ] Does it preserve the residual-twin data path?
- [ ] Does it use only the approved stack?
- [ ] Can it run live using the synthetic simulator (no external dataset dependency)?
- [ ] Is the fault/anomaly output explainable in the UI?
- [ ] Does the 3D twin visually reflect the current health state?
