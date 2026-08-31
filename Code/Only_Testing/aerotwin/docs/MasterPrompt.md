# MasterPrompt.md — AeroTwin Full Development Plan
### (Feed this to Antigravity / your AI coding agent as the master build instruction)

---

## ROLE

You are the lead full-stack + ML engineer building **AeroTwin** — an AI-Enabled Digital Twin for Aero Piston Engine Health Monitoring, built for SIH 2026 Problem Statement 26054 (DRDO). Before implementing anything, read `SKILL.md` (scope + architecture guardrails) and `workflow.md` (real-time data flow spec) in this same `docs/` folder. Treat both as binding constraints, not suggestions.

---

## PROJECT SUMMARY

Build a working prototype that:
1. Simulates a piston engine's physics-based behavior and generates realistic real-time telemetry (with injectable faults)
2. Runs a **physics-informed digital twin** that predicts expected sensor values
3. Computes **residuals** (actual − predicted) as the core signal
4. Runs ML on residuals for anomaly detection → fault classification → RUL estimation
5. Streams everything in real time over WebSocket to a **React + Three.js dashboard** showing a live 3D engine twin that visually reflects health state
6. Supports **mission replay** and **what-if environmental simulation**
7. Produces a maintenance advisory + mission health report

---

## DEVELOPMENT PHASES

### Phase 0 — Project Bootstrap
- Initialize monorepo structure exactly as defined in `SKILL.md` Section 5
- Set up `backend/` (Python, FastAPI, Poetry/venv) and `frontend/` (React + Vite)
- Set up Docker Compose with services: `backend`, `frontend`, `db` (SQLite/Postgres), optional `redis` for pub/sub
- **Deliverable:** Empty but running skeleton — `docker-compose up` boots both frontend and backend with a health-check endpoint

### Phase 1 — Physics-Informed Engine Model + Synthetic Telemetry Generator
- Implement a simplified 4-stroke piston engine thermodynamic model in Python (`backend/physics/`)
  - Inputs: throttle %, altitude, ambient temp, RPM demand
  - Outputs: expected RPM, CHT, EGT, oil pressure/temp, fuel flow, vibration baseline, injection timing
- Build the **Energy Field Generator**: computes the expected "energy signature" for the current operating condition
- Build a **synthetic telemetry generator** (`backend/simulator/`) that:
  - Produces continuous realistic sensor streams
  - Supports **fault injection** (misfire, injector abnormality, cooling degradation, lubrication issue, sensor drift, combustion instability, overheating, abnormal vibration) with configurable severity/onset time
- **Deliverable:** CLI script that streams JSON telemetry packets to stdout/WebSocket, normal + fault scenarios selectable via config

### Phase 2 — Backend API + Real-Time Pipeline
- Build FastAPI REST endpoints: mission list, mission detail, health report, config
- Build WebSocket endpoint that streams live telemetry + computed residuals + ML outputs each tick
- Wire the **Residual Twin**: for every incoming telemetry packet, run the physics model in parallel and emit `residual_vector`
- Persist every tick (raw + residual + ML output) to the database for replay
- **Deliverable:** WebSocket client (test script) receiving live residual-annotated telemetry end-to-end

### Phase 3 — AI/ML Layer (operates on residuals only)
- **Anomaly Detection:** Isolation Forest or Autoencoder trained on healthy-state residual vectors; flags deviation
- **Fault Classification:** Gradient-boosted tree or small neural net trained on labeled fault-injected residual sequences → outputs fault class + confidence
- **RUL Estimation:** Trend/degradation model (e.g., exponential degradation fit or LSTM on residual trend windows) → outputs estimated remaining safe operating hours
- **Explainability Layer:** For each alert, output top contributing residual channels (e.g., via SHAP or simple residual-magnitude ranking)
- **Deliverable:** `backend/ml/` module with `predict(residual_vector) -> {anomaly_score, fault_class, confidence, rul_hours, top_contributors}`

### Phase 4 — Real-Time Integration
- Connect Phase 1 (simulator) → Phase 2 (pipeline) → Phase 3 (ML) into a single live loop
- Define the tick rate (see `workflow.md`) and ensure ML inference fits within the latency budget
- Add severity-based routing: Low → log, Medium → dashboard advisory, High/Critical → real-time alert
- **Deliverable:** Fully running live loop, observable via WebSocket, no manual triggering needed

### Phase 5 — Frontend Dashboard (React)
- Set up state management (Zustand/Redux) with a `useTelemetrySocket` hook subscribing to backend WebSocket
- Build dashboard panels:
  - Live parameter readouts (gauges/charts) — Section B parameters
  - Fault alert feed with explanation (top contributing residuals)
  - Health index + degradation trend chart
  - RUL countdown display
  - Maintenance advisory panel
  - Mission-wise health report view
- **Deliverable:** Live dashboard reflecting real-time simulated engine state

### Phase 6 — 3D Digital Twin Visualization (Three.js / React Three Fiber)
- Build a 3D engine model (can use a stylized/simplified piston-engine mesh, doesn't need to be photoreal)
- Bind mesh materials/animations to live health state:
  - Color-coded heat overlay on cylinder head based on CHT/EGT residual
  - Vibration jitter animation tied to vibration residual magnitude
  - Subtle rotation speed tied to RPM
  - Red/amber/green halo or particle effect based on severity state
- **Deliverable:** 3D twin that visibly changes appearance as faults are injected in the simulator

### Phase 7 — Simulation & Replay Module
- **Mission Replay:** Load a stored mission's tick-by-tick data and "replay" it through the same dashboard/3D twin UI at adjustable speed
- **What-If Simulator:** UI controls to set altitude/ambient temp/throttle profile and re-run the physics model to preview expected engine behavior before flight (high altitude, endurance, hot-weather, rapid throttle presets)
- **Deliverable:** Toggle between Live Mode and Replay/What-If Mode in the frontend, same visualization components reused

### Phase 8 — Integration, Polish, Demo Readiness
- End-to-end test: run simulator with a scripted fault-injection scenario, confirm detection → classification → RUL → alert → dashboard → 3D twin all update correctly
- Add a scenario selector for demo purposes (Normal Flight / Misfire Onset / Overheating Trend / Sensor Drift, etc.)
- Polish UI (loading states, empty states, responsive layout)
- **Deliverable:** Reliable, repeatable demo script

### Phase 9 — Documentation & Deployment Roadmap
- Write architecture README (reuse the solution `.md` produced earlier)
- Document API contracts (REST + WebSocket message schemas — see `workflow.md`)
- Write deployment roadmap: test-rig validation → edge deployment → fleet-level federated learning → certification (as previously outlined)
- **Deliverable:** Complete `README.md`, API docs, and submission-ready documentation set

---

## AGENT OPERATING RULES

1. Before starting any phase, re-check `SKILL.md` Section 2 (scope anchors) and Section 3 (architecture invariant)
2. Never skip the residual computation step, even for quick prototypes
3. Keep every ML input/output contract consistent with the field names defined in `SKILL.md` Section 6
4. Prefer incremental, runnable milestones over large unverified blocks of code — each phase should end in something demonstrably running
5. Flag (do not silently resolve) any ambiguity about real vs. simulated data — always label simulated data explicitly in the UI
6. If a phase's deliverable can't be verified end-to-end, stop and report rather than proceeding to the next phase
