# AeroTwin — MALE UAV Aero Engine Diagnostics

AeroTwin is an AI-powered Digital Twin framework engineered for real-time health monitoring, fault prediction, and mission reliability enhancement of MALE UAV aero piston engines.

This system requires no additional hardware and uses existing sensors via SAE J1939 to detect anomalies in real-time.

## Features

- **Real-Time Anomaly Detection**: Uses a PyTorch neural network architecture to identify leaks and faults with >90% accuracy.
- **Specific Zone Localization**: Pinpoints fault locations across 5 distinct engine zones (Intake, Charge Air, CAC/Manifold, Exhaust Manifold, DPF/SCR).
- **Digital Twins**: Physics-informed digital twins (mass continuity, turbo compressor map, CAC heat exchanger, combustion energy balance) run alongside the ML models to generate expected healthy baselines.
- **Energy Field Analysis**: Computes the thermodynamic correlation manifold of the aero engine to detect subtle structural distortions before they cause critical mission failures.
- **Premium Glassmorphic Dashboard**: A React frontend built with Vite provides a stunning real-time visualization of engine health, including a 6x6 live Energy Field heatmap.
- **Simulated Real-World Data**: Includes a synthetic data generator based on aero piston engine power/torque curves to simulate realistic engine states (healthy and faulty).

## Architecture

1. **Backend**: FastAPI (Python) running the digital twins and PyTorch neural networks.
2. **Frontend**: React + Vite + Vanilla CSS for a zero-dependency, ultra-fast UI.
3. **ML Pipeline**: 
   - Physics digital twins generate residuals.
   - Energy Field computes relationship manifolds.
   - 31-dimensional feature vector fed into neural network models.
   - `RandomForest` and `GradientBoosting` ensemble to provide robustness.

## Setup & Running

### Requirements
- Python 3.9+
- Node.js 18+

### Quick Start
Just run the provided `run.bat` file from the directory:
```cmd
run.bat
```
This will automatically:
1. Start the FastAPI backend on port 8000.
2. Build/preview the Vite dev server on port 5173.
3. Open your browser to the dashboard.

### Manual Setup
**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## How to Test
Once the dashboard is open:
1. Click the **"Start Live Demo"** button to start a simulated sensor stream. The demo will automatically cycle through healthy states and inject different types of faults.
2. You can manually inject specific leaks/faults using the dropdowns and the **"Inject & Predict"** button.
3. **Interactive Engine Diagram & Level Meters**: In the **Engine Diagram** page, you can drag the sliders or click on the Zone map to instantly simulate faults. The digital twin AI recognizes the following specific sensor threshold patterns:

   * **🔴 Zone 1 (Intake Leak)**: Drop MAF to ~650, Drop Boost Pressure to ~180, Raise Charge Air Temp to ~47
   * **🔴 Zone 2 (Charge Air Leak)**: Drop Boost Pressure significantly to ~160, Raise Charge Air Temp to ~55
   * **🔴 Zone 3 (CAC/Manifold Leak)**: Drop Boost Pressure to ~150, Raise Exhaust Temp significantly to ~620, Raise Charge Air Temp to ~52
   * **🔴 Zone 4 (Exhaust Manifold Leak)**: Drop Exhaust Temp significantly to ~420, Drop Boost Pressure slightly to ~190
   * **🔴 Zone 5 (Aftertreatment / DPF Leak)**: Drop DPF Delta P to ~0.1, Raise Exhaust Temp slightly to ~580

## Repository Structure
- `backend/` - FastAPI server, PyTorch models, Digital Twins, and Data Generator
  - `backend/main.py` - Main API and WebSocket server
  - `backend/ml/` - Neural networks, ensemble model, energy field detector, and training pipeline
  - `backend/twins/` - Physics-based digital twins (Intake, Charge Air, Exhaust)
  - `backend/data_generator.py` - Synthetic dataset generator for the aero piston engine
- `frontend/` - React dashboard
  - `frontend/src/App.jsx` - Main React component with real-time UI
  - `frontend/src/index.css` - Premium glassmorphic styling
- `run.bat` - Application launcher
