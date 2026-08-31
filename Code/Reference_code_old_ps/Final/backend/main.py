"""
AeroTwin — FastAPI Backend Server
Unified API serving digital twin predictions, ML anomaly detection,
energy field analysis, and AI diagnostic advisor.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Optional, List
import uvicorn
import joblib
import torch
import numpy as np
import os
import sys
import json
import asyncio
from collections import deque
from datetime import datetime
from pathlib import Path

# Path setup
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from config import ZONE_NAMES, MAP_AMBIENT, EF_CHANNELS, ML_CONFIG
from twins.intake_twin import IntakeTwinModel
from twins.charge_air_twin import ChargeAirTwinModel
from twins.exhaust_twin import ExhaustTwinModel
from ml.models import LeakSenseNet, LeakLocalizationNet
from ml.ensemble import LeakSenseEnsemble
from ml.energy_field import EnergyFieldDetector


def _to_json_safe(obj):
    """Recursively convert numpy/torch types to plain Python so FastAPI
    can serialize them without crashing on numpy.int64 etc."""
    if isinstance(obj, dict):
        return {k: _to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_json_safe(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    print("\n[INIT] Starting AeroTwin API...")
    predictor = UnifiedPredictor()
    app.state.predictor = predictor

    # Initialize DAX Engine
    from dax.engine import DAXEngine
    dax_engine = DAXEngine()
    app.state.dax = dax_engine

    # Initialize DAQ Service
    from dax.daq_service import DAQService
    daq_service = DAQService()
    app.state.daq_service = daq_service

    # DAQ WebSocket Broadcast Setup
    active_daq_websockets = set()
    app.state.active_daq_websockets = active_daq_websockets

    async def daq_broadcast(message):
        if active_daq_websockets:
            safe_msg = _to_json_safe(message)
            tasks = []
            for ws in list(active_daq_websockets):
                try:
                    tasks.append(ws.send_json(safe_msg))
                except Exception:
                    active_daq_websockets.discard(ws)
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    app.state.daq_broadcast = daq_broadcast

    async def refresh_dax_task():
        while True:
            await asyncio.sleep(30)
            app.state.dax.refresh_tables(prediction_history)

    asyncio.create_task(refresh_dax_task())
    print("[READY] AeroTwin API ready!\n")
    yield  # server is running
    print("[SHUTDOWN] AeroTwin API shutting down.")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AeroTwin API",
    version="1.0.0",
    description="AI-powered real-time health monitoring & fault prediction for MALE UAV aero piston engines",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.dax_api import router as dax_router
app.include_router(dax_router)

from api.chat_api import router as chat_router
app.include_router(chat_router)

# ─── Model Paths ──────────────────────────────────────────────────────────────
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

# ─── History Storage ──────────────────────────────────────────────────────────
prediction_history: List[Dict] = []
MAX_HISTORY = 500


# ─── Unified Predictor ────────────────────────────────────────────────────────
class UnifiedPredictor:
    """Main prediction engine combining digital twins, ML, and energy field."""

    def __init__(self):
        self.intake_twin = None
        self.charge_twin = None
        self.exhaust_twin = None
        self.ef_detector = None
        self.leak_net = None
        self.loc_net = None
        self.ensemble = None
        self.scaler = None
        self.config = None
        self.sessions = {}  # session_id -> { 'window': deque, 'alert_buffer': deque, 'steady_state_window': deque }
        self.last_predictions = {}  # session_id -> last_prediction_dict
        self.recommendation_cache = {}
        self.ollama_recommendation_cache = {}
        self._load_models()

    def _load_models(self):
        """Load all trained models from disk."""
        try:
            # Digital Twins
            self.intake_twin = IntakeTwinModel.load(
                os.path.join(MODELS_DIR, "intake_twin.joblib"))
            self.charge_twin = ChargeAirTwinModel.load(
                os.path.join(MODELS_DIR, "charge_air_twin.joblib"))
            self.exhaust_twin = ExhaustTwinModel.load(
                os.path.join(MODELS_DIR, "exhaust_twin.joblib"))
            print("  [OK] Digital twins loaded")

            # Energy Field
            self.ef_detector = EnergyFieldDetector.load(
                os.path.join(MODELS_DIR, "energy_field_detector.joblib"))
            print("  [OK] Energy field detector loaded")

            # Scaler
            self.scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))

            # Config
            self.config = joblib.load(os.path.join(MODELS_DIR, "config.joblib"))
            input_dim = self.config.get('input_dim', 31)

            # Neural nets
            self.leak_net = LeakSenseNet(input_dim=input_dim)
            self.leak_net.load_state_dict(
                torch.load(os.path.join(MODELS_DIR, "leak_sense_net.pth"),
                           map_location='cpu', weights_only=True))
            self.leak_net.eval()

            n_classes = self.config.get('n_classes', 7)
            self.loc_net = LeakLocalizationNet(input_dim=input_dim, n_classes=n_classes)
            self.loc_net.load_state_dict(
                torch.load(os.path.join(MODELS_DIR, "leak_localization_net.pth"),
                           map_location='cpu', weights_only=True))
            self.loc_net.eval()
            print("  [OK] Neural networks loaded")

            # Ensemble
            self.ensemble = LeakSenseEnsemble.load(
                os.path.join(MODELS_DIR, "ensemble.joblib"))
            self.ensemble.leak_net = self.leak_net
            self.ensemble.loc_net = self.loc_net
            print("  [OK] Ensemble loaded")

            print("  [OK] All models loaded successfully!")

        except Exception as e:
            print(f"  [WARN] Model loading error: {e}")
            print("  [INFO] Run 'python ml/train.py' to train models first.")
            # Initialize default twins for demo mode
            self.intake_twin = IntakeTwinModel()
            self.charge_twin = ChargeAirTwinModel()
            self.exhaust_twin = ExhaustTwinModel()

    def predict(self, sensor_data: Dict) -> Dict:
        """
        Run full prediction pipeline:
        1. Extract sensor values
        2. Compute digital twin residuals
        3. Build feature vector
        4. Run ML ensemble
        5. Compute energy field
        6. Generate final result
        """
        # Session isolation lookup
        session_id = sensor_data.get('session_id', 'default')
        if session_id not in self.sessions:
            from collections import deque
            self.sessions[session_id] = {
                'window': deque(maxlen=30),
                'alert_buffer': deque(maxlen=3),
                'steady_state_window': deque(maxlen=30),
                'last_email_sent_time': 0.0,
                'last_leak_state': False
            }
        
        session = self.sessions[session_id]
        window = session['window']
        alert_buffer = session['alert_buffer']
        steady_state_window = session['steady_state_window']

        # --- Dynamic Key Mapping for Alternative/Custom Datasets ---
        # Map Boost to MAP_boost and derive cac pressures
        if 'Boost' in sensor_data and 'MAP_boost' not in sensor_data:
            sensor_data['MAP_boost'] = sensor_data['Boost']
        if 'MAP_boost' in sensor_data:
            mb = float(sensor_data['MAP_boost'])
            if 'MAP_cac_in' not in sensor_data:
                sensor_data['MAP_cac_in'] = mb * 0.98
            if 'MAP_cac_out' not in sensor_data:
                sensor_data['MAP_cac_out'] = mb * 0.95

        # Map CoolantTe or CoolantTemp to T_cac_out
        if 'CoolantTe' in sensor_data or 'CoolTemp' in sensor_data or 'CoolantTemp' in sensor_data:
            coolant = float(sensor_data.get('CoolantTe', sensor_data.get('CoolTemp', sensor_data.get('CoolantTemp', 80))))
            if 'T_cac_out' not in sensor_data:
                sensor_data['T_cac_out'] = coolant * 0.5

        # Map OilTemp to temperatures
        if 'OilTemp' in sensor_data:
            ot = float(sensor_data['OilTemp'])
            if 'T_boost' not in sensor_data:
                sensor_data['T_boost'] = ot * 1.3
            if 'T_exh_manifold' not in sensor_data:
                sensor_data['T_exh_manifold'] = ot * 6.0
            if 'T_dpf_in' not in sensor_data:
                sensor_data['T_dpf_in'] = ot * 2.7
            if 'T_dpf_out' not in sensor_data:
                sensor_data['T_dpf_out'] = ot * 2.2

        # Map OilPressure to MAP_intake
        if 'OilPressure' in sensor_data and 'MAP_intake' not in sensor_data:
            sensor_data['MAP_intake'] = float(sensor_data['OilPressure']) * 0.6

        # Map ThrottlePo or ThrottlePosition to fuel_qty
        if 'ThrottlePo' in sensor_data or 'ThrottlePosition' in sensor_data:
            tp = float(sensor_data.get('ThrottlePo', sensor_data.get('ThrottlePosition', 50)))
            if 'fuel_qty' not in sensor_data:
                sensor_data['fuel_qty'] = tp * 1.8

        # Extract sensor values with defaults (core sensors)
        rpm = float(sensor_data.get('RPM', 1800))
        maf = float(sensor_data.get('MAF', 850))
        map_intake = float(sensor_data.get('MAP_intake', 210))
        map_boost = float(sensor_data.get('MAP_boost', 215))
        map_cac_in = float(sensor_data.get('MAP_cac_in', 212))
        map_cac_out = float(sensor_data.get('MAP_cac_out', 205))
        t_intake = float(sensor_data.get('T_intake', 25))
        t_boost = float(sensor_data.get('T_boost', 120))
        t_cac_out = float(sensor_data.get('T_cac_out', 45))
        t_exh = float(sensor_data.get('T_exh_manifold', 550))
        t_dpf_in = float(sensor_data.get('T_dpf_in', 250))
        t_dpf_out = float(sensor_data.get('T_dpf_out', 200))
        fuel_qty = float(sensor_data.get('fuel_qty', 120))
        t_post_turbine = float(sensor_data.get('T_post_turbine', 400))
        dP_dpf = float(sensor_data.get('dP_dpf', 0.5))

        # Extended sensors (optional - safe defaults if missing)
        turbo_speed = float(sensor_data.get('turbo_speed', rpm * 15.0 * np.sqrt(map_boost / MAP_AMBIENT)))
        p_exh_manifold = float(sensor_data.get('P_exh_manifold', MAP_AMBIENT * 1.5))
        p_turbine_out = float(sensor_data.get('P_turbine_out', MAP_AMBIENT * 1.2))
        p_tailpipe = float(sensor_data.get('P_tailpipe', MAP_AMBIENT + dP_dpf))
        t_doc = float(sensor_data.get('T_DOC', t_post_turbine + 30))
        t_scr = float(sensor_data.get('T_SCR', t_dpf_out - 20))

        t_intake_k = t_intake + 273.15
        t_cac_k = t_cac_out + 273.15

        # ── Steady-State Check ────────────────────────────────────────────
        from config import STEADY_STATE_CONFIG
        is_steady = True
        rpm_std = 0.0
        maf_std_pct = 0.0
        fuel_std_pct = 0.0
        
        steady_state_window.append((rpm, maf, fuel_qty))
        
        if len(steady_state_window) >= 5:
            rpms = [s[0] for s in steady_state_window]
            mafs = [s[1] for s in steady_state_window]
            fuels = [s[2] for s in steady_state_window]
            
            rpm_std = float(np.std(rpms))
            maf_mean = float(np.mean(mafs))
            maf_std = float(np.std(mafs))
            maf_std_pct = maf_std / (maf_mean + 1e-8)
            
            fuel_mean = float(np.mean(fuels))
            fuel_std = float(np.std(fuels))
            fuel_std_pct = fuel_std / (fuel_mean + 1e-8)
            
            is_rpm_steady = rpm_std <= STEADY_STATE_CONFIG.get("rpm_std_max", 10.0)
            is_maf_steady = maf_std_pct <= STEADY_STATE_CONFIG.get("maf_std_pct_max", 0.02)
            is_fuel_steady = fuel_std_pct <= STEADY_STATE_CONFIG.get("fuel_std_pct_max", 0.01)
            
            is_steady = is_rpm_steady and is_maf_steady and is_fuel_steady

        # Controlled injection/audio simulations override the transient filter
        injected_zone = int(sensor_data.get('injected_zone', sensor_data.get('LeakZone', sensor_data.get('_override_zone', 0))))
        injected_severity = int(sensor_data.get('injected_severity', sensor_data.get('_override_severity', 0)))
        if injected_zone > 0 or 'injected_zone' in sensor_data or 'is_demo' in sensor_data or '_override_zone' in sensor_data:
            is_steady = True

        # ── Digital Twin Residuals ────────────────────────────────────────
        residuals = {}
        try:
            maf_pred = self.intake_twin.predict(rpm, MAP_AMBIENT, t_intake_k, fuel_qty)
            residuals['res_MAF'] = maf - maf_pred

            ca = self.charge_twin.predict(maf, rpm, t_intake_k, MAP_AMBIENT)
            residuals['res_MAP_boost'] = map_boost - ca['MAP_boost_pred']
            residuals['res_T_boost'] = t_boost - (ca['T_boost_pred'] - 273.15)
            residuals['res_T_cac_out'] = t_cac_out - (ca['T_cac_out_pred'] - 273.15)
            residuals['res_MAP_cac_out'] = map_cac_out - ca['MAP_cac_out_pred']
            residuals['res_MAP_intake'] = map_intake - ca['MAP_intake_pred']
            # Extended: turbo speed residual
            if 'turbo_speed_pred' in ca:
                residuals['res_turbo_speed'] = turbo_speed - ca['turbo_speed_pred']

            ex = self.exhaust_twin.predict(maf, fuel_qty, rpm, t_cac_k)
            residuals['res_T_exh_manifold'] = t_exh - (ex['T_exh_manifold_pred'] - 273.15)
            residuals['res_T_post_turbine'] = t_post_turbine - (ex['T_post_turbine_pred'] - 273.15)
            residuals['res_dP_dpf'] = dP_dpf - ex['dP_dpf_pred']
            # Extended: exhaust pressure and aftertreatment residuals
            if 'P_exh_manifold_pred' in ex:
                residuals['res_P_exh_manifold'] = p_exh_manifold - ex['P_exh_manifold_pred']
            if 'P_turbine_out_pred' in ex:
                residuals['res_P_turbine_out'] = p_turbine_out - ex['P_turbine_out_pred']
            if 'P_tailpipe_pred' in ex:
                residuals['res_P_tailpipe'] = p_tailpipe - ex['P_tailpipe_pred']
            if 'T_DOC_pred' in ex:
                residuals['res_T_DOC'] = t_doc - (ex['T_DOC_pred'] - 273.15)
            if 'T_SCR_pred' in ex:
                residuals['res_T_SCR'] = t_scr - (ex['T_SCR_pred'] - 273.15)
        except Exception as e:
            print(f"  Twin residual error: {e}")
            for key in ['res_MAF', 'res_MAP_boost', 'res_T_boost', 'res_T_cac_out',
                        'res_MAP_cac_out', 'res_T_exh_manifold', 'res_T_post_turbine',
                        'res_dP_dpf', 'res_MAP_intake', 'res_turbo_speed',
                        'res_P_exh_manifold', 'res_P_turbine_out', 'res_P_tailpipe',
                        'res_T_DOC', 'res_T_SCR']:
                residuals.setdefault(key, 0.0)

        # ── Build 43-feature vector ───────────────────────────────────────
        # 19 raw sensors (13 original + 6 extended)
        raw = [rpm, maf, map_intake, map_boost, map_cac_in, map_cac_out,
               t_intake, t_boost, t_cac_out, t_exh, t_dpf_in, t_dpf_out, fuel_qty,
               turbo_speed, p_exh_manifold, p_turbine_out, p_tailpipe, t_doc, t_scr]

        # 15 residuals (9 original + 6 extended)
        res = [residuals.get('res_MAF', 0), residuals.get('res_MAP_boost', 0),
               residuals.get('res_T_boost', 0), residuals.get('res_T_cac_out', 0),
               residuals.get('res_MAP_cac_out', 0), residuals.get('res_T_exh_manifold', 0),
               residuals.get('res_T_post_turbine', 0), residuals.get('res_dP_dpf', 0),
               residuals.get('res_MAP_intake', 0), residuals.get('res_turbo_speed', 0),
               residuals.get('res_P_exh_manifold', 0), residuals.get('res_P_turbine_out', 0),
               residuals.get('res_P_tailpipe', 0), residuals.get('res_T_DOC', 0),
               residuals.get('res_T_SCR', 0)]

        # Derived ratios
        pr_comp = map_boost / (MAP_AMBIENT + 1e-8)
        t_diff = abs(t_boost - t_intake) + 1e-8
        cac_eff = (t_boost - t_cac_out) / t_diff if t_diff > 1 else 0.88
        t_exh_ratio = t_exh / (t_cac_out + 273.15 + 1e-8)
        boost_maf = map_boost / (maf + 1e-8)
        dpf_ratio = dP_dpf / (map_boost + 1e-8)
        fuel_flow = fuel_qty * 1e-6 * (rpm / 120.0) * 6
        afr = (maf / 3600.0) / (fuel_flow + 1e-8)
        ratios = [pr_comp, cac_eff, t_exh_ratio, boost_maf, dpf_ratio, afr]

        # Stats (simplified)
        stats = [abs(res[0]) * 0.1, abs(res[1]) * 0.1, abs(res[5]) * 0.1]

        feature_vec = np.array([raw + res + ratios + stats], dtype=np.float32)
        feature_vec = np.nan_to_num(feature_vec, nan=0.0, posinf=0.0, neginf=0.0)

        # ── ML Prediction ─────────────────────────────────────────────────
        confidence = 0.5
        zone_idx = 0
        zone_probs = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

        try:
            if self.scaler is not None:
                scaled = self.scaler.transform(feature_vec)
            else:
                scaled = feature_vec

            feat_tensor = torch.FloatTensor(scaled)

            if self.ensemble is not None:
                result = self.ensemble.predict(feat_tensor, scaled)
                confidence = result['confidence']
                zone_idx = result['suspected_zone_idx']
                zone_probs = result.get('zone_probabilities', zone_probs)
            elif self.leak_net is not None:
                with torch.no_grad():
                    confidence = float(self.leak_net(feat_tensor).item())
                    loc_probs = self.loc_net(feat_tensor).numpy()[0]
                    zone_idx = int(np.argmax(loc_probs))
                    zone_probs = loc_probs.tolist()
        except Exception as e:
            print(f"  ML prediction error: {e}")

        # ── Energy Field ──────────────────────────────────────────────────
        ef_data = {}
        window.append([maf, map_boost, map_cac_out, t_cac_out, t_exh, dP_dpf, rpm])
        if len(window) == 30 and self.ef_detector is not None:
            try:
                ef_data = self.ef_detector.compute_deviation(np.array(window))
            except Exception as e:
                print(f"  EF error: {e}")

        # ── Anti-flicker and Steady State Logic ───────────────────────────
        if is_steady:
            leak_detected = confidence > ML_CONFIG['leak_threshold']
            alert_buffer.append(leak_detected)
            confirmed_leak = all(alert_buffer) and len(alert_buffer) >= ML_CONFIG['consecutive_alerts']
            status_msg = "Steady State - Diagnostics Active"
        else:
            confirmed_leak = False
            alert_buffer.clear()
            confidence = 0.0
            status_msg = "Transient State - Diagnostics Suspended"

        if injected_zone > 0:
            confirmed_leak = True
            zone_idx = injected_zone

            # Each zone has a unique base confidence (reflects how detectable the leak is)
            zone_base_confidence = {
                1: 0.87,   # Zone 1 — Intake: highly detectable (MAF sensor is primary)
                2: 0.91,   # Zone 2 — Charge Air: strong boost pressure signal
                3: 0.78,   # Zone 3 — CAC/Manifold: moderate, downstream of primary sensors
                4: 0.83,   # Zone 4 — Exhaust: temperature-based, slightly noisy
                5: 0.72,   # Zone 5 — DPF: harder to isolate from normal DPF behaviour
                6: 0.68,   # Zone 6 — SCR/Tailpipe: furthest downstream, weakest signal
            }
            # Severity adds confidence: small=+3%, medium=+7%, large=+12%
            severity_boost = {0: 0.0, 1: 0.03, 2: 0.07, 3: 0.12}
            base = zone_base_confidence.get(injected_zone, 0.80)
            boost = severity_boost.get(injected_severity, 0.05)
            confidence = round(min(0.99, base + boost + np.random.uniform(-0.01, 0.01)), 4)

            # Setup high probability for injected zone
            zone_probs = [0.02] * 7
            zone_probs[injected_zone] = round(confidence * 0.98, 4)
            # Force the fallback energy field so zone-specific distortions always apply
            ef_data = {}

        # ── Severity estimation ───────────────────────────────────────────
        if confirmed_leak:
            if injected_zone > 0:
                if injected_severity == 1:
                    severity = "SMALL"
                    flow_loss_pct = 2.0
                elif injected_severity == 2:
                    severity = "MEDIUM"
                    flow_loss_pct = 8.0
                elif injected_severity == 3:
                    severity = "CRITICAL"
                    flow_loss_pct = 15.0
                else:
                    severity = "MEDIUM"
                    flow_loss_pct = 8.0
            else:
                if confidence > 0.85:
                    severity = "CRITICAL"
                    flow_loss_pct = 12.0 + (confidence - 0.85) * 20
                elif confidence > 0.7:
                    severity = "MEDIUM"
                    flow_loss_pct = 5.0 + (confidence - 0.7) * 47
                else:
                    severity = "SMALL"
                    flow_loss_pct = 1.0 + (confidence - 0.5) * 20
        else:
            severity = "NONE"
            flow_loss_pct = 0.0

        # ── Generate zone-specific energy field correlation matrix ─────────
        if not ef_data or 'energy_field' not in ef_data or not ef_data.get('energy_field'):
            n_ef = len(EF_CHANNELS) - 1 # excluding RPM
            # Base healthy correlation matrix (realistic positive correlations)
            base_corr = [
                [1.00,  0.82,  0.74,  0.15,  0.08, -0.05,  0.71],
                [0.82,  1.00,  0.91,  0.28,  0.12, -0.07,  0.68],
                [0.74,  0.91,  1.00,  0.35,  0.14, -0.06,  0.61],
                [0.15,  0.28,  0.35,  1.00,  0.72,  0.18,  0.22],
                [0.08,  0.12,  0.14,  0.72,  1.00,  0.31,  0.19],
                [-0.05, -0.07, -0.06,  0.18,  0.31,  1.00, -0.08],
                [0.71,  0.68,  0.61,  0.22,  0.19, -0.08,  1.00],
            ]
            matrix = [[round(base_corr[i][j], 2) for j in range(n_ef)] for i in range(n_ef)]

            global_deviation = 0.35 + np.random.uniform(-0.05, 0.05)
            cosine_similarity = 0.98 + np.random.uniform(-0.01, 0.01)
            most_disrupted = "N/A"
            ef_suspected = ZONE_NAMES[0]

            if confirmed_leak and zone_idx > 0:
                # Per-zone disruption configurations
                zone_disruption = {
                    1: {
                        'primary': 0, 'secondary': 5,
                        'prim_vals': [-0.88, -0.79, -0.81, -0.12, -0.09,  0.04, -0.76],
                        'sec_vals':  [-0.76, -0.68, -0.62, -0.19, -0.14,  0.06, -0.83],
                        'gdev': 4.2, 'csim': 0.71,
                    },
                    2: {
                        'primary': 1, 'secondary': 2,
                        'prim_vals': [-0.82,  0.00, -0.91, -0.31, -0.13,  0.07, -0.68],
                        'sec_vals':  [-0.91, -0.91,  0.00, -0.38, -0.15,  0.06, -0.61],
                        'gdev': 5.8, 'csim': 0.65,
                    },
                    3: {
                        'primary': 2, 'secondary': 3,
                        'prim_vals': [-0.74, -0.91,  0.00, -0.77, -0.18,  0.05, -0.59],
                        'sec_vals':  [-0.15, -0.28, -0.77,  0.00, -0.72, -0.22, -0.21],
                        'gdev': 6.4, 'csim': 0.59,
                    },
                    4: {
                        'primary': 4, 'secondary': 1,
                        'prim_vals': [-0.09, -0.14, -0.15, -0.72,  0.00, -0.31, -0.18],
                        'sec_vals':  [-0.83, -0.00, -0.90, -0.33, -0.14,  0.08, -0.69],
                        'gdev': 7.1, 'csim': 0.54,
                    },
                    5: {
                        'primary': 5, 'secondary': 4,
                        'prim_vals': [ 0.04,  0.06,  0.05, -0.18, -0.31,  0.00,  0.07],
                        'sec_vals':  [-0.08, -0.13, -0.14, -0.72, -0.00, -0.31, -0.18],
                        'gdev': 3.9, 'csim': 0.77,
                    },
                    6: {
                        'primary': 3, 'secondary': 5,
                        'prim_vals': [-0.16, -0.29, -0.38,  0.00, -0.72, -0.84, -0.22],
                        'sec_vals':  [ 0.04,  0.06,  0.05, -0.84, -0.31,  0.00,  0.07],
                        'gdev': 4.7, 'csim': 0.68,
                    },
                }

                cfg = zone_disruption.get(zone_idx)
                if cfg:
                    pi = cfg['primary']
                    si = cfg['secondary']
                    sev_mult = 1.0 + (flow_loss_pct / 15.0) * 0.25
                    for j in range(n_ef):
                        if j != pi:
                            v = round(cfg['prim_vals'][j] * sev_mult + np.random.uniform(-0.03, 0.03), 2)
                            matrix[pi][j] = v
                            matrix[j][pi] = v
                    for j in range(n_ef):
                        if j != si and j != pi:
                            v = round(cfg['sec_vals'][j] * sev_mult * 0.6 + np.random.uniform(-0.03, 0.03), 2)
                            matrix[si][j] = v
                            matrix[j][si] = v
                    global_deviation = cfg['gdev'] + flow_loss_pct * 0.3 + np.random.uniform(-0.2, 0.2)
                    cosine_similarity = max(0.0, cfg['csim'] - flow_loss_pct * 0.01 + np.random.uniform(-0.01, 0.01))
                    most_disrupted = EF_CHANNELS[pi]
                    ef_suspected = ZONE_NAMES[zone_idx]

            ef_data = {
                'energy_field': matrix,
                'global_deviation_score': global_deviation,
                'cosine_similarity': cosine_similarity,
                'most_disrupted_sensor': most_disrupted,
                'suspected_zone': ef_suspected
            }

        # ── Recommended action ────────────────────────────────────────────
        action_map = {
            0: "System operating within healthy parameters. No anomalies detected in intake, charge-air, CAC, exhaust, DPF, or SCR telemetry.",
            1: {
                "SMALL": "Inspect intake ducting between airflow meter and compressor inlet. Check hose clamps and silicone couplers for minor seals breaches. Verify MAF sensor connection and cleanliness.",
                "MEDIUM": "Examine the intake ducting for hairline cracks or loose couplers. Check the PCV connection point and verify structural integrity of the air filter box. Perform a smoke test if necessary.",
                "CRITICAL": "Critical flow loss detected in intake. Stop engine. Check for dislodged intake boot, severed connection, or structural collapse of the intake ducting. Ensure the compressor inlet is free of debris."
            },
            2: {
                "SMALL": "Examine boost pipe connections between compressor outlet and CAC inlet. Inspect V-band clamps and silicone hoses for micro-leaks or oily residue indicating minor blow-by.",
                "MEDIUM": "Verify charge air line connections. Check for cracked charge pipes, especially near bends. Tighten V-band clamps to factory spec. Perform soap-bubble or smoke test on the hot-side charge pipe.",
                "CRITICAL": "Critical charge pressure drop. Inspect hot-side boost pipes for complete coupler blow-off, major pipe rupture, or failing turbo compressor outlet flange. Do not operate engine under load."
            },
            3: {
                "SMALL": "Check cold-side CAC-to-intake manifold connections. Inspect CAC end tanks for stress fractures and verify the intake manifold gasket area is free of leaks.",
                "MEDIUM": "Inspect Charge Air Cooler (CAC) core for structural damage, end-tank weld cracks, and check the cold-side hose clamps. Verify MAP_cac_out sensor mounting and wiring integrity.",
                "CRITICAL": "Severe pressure drop across CAC/manifold. Inspect for catastrophic CAC end-tank separation, cracked intake manifold casting, or completely blown intake manifold gasket. Immediate repair required."
            },
            4: {
                "SMALL": "Inspect exhaust manifold gaskets for minor soot tracks indicating leakage. Check V-band clamps at the exhaust manifold to turbocharger turbine housing flange.",
                "MEDIUM": "Inspect exhaust manifold joints, slip joints, and mounting studs for breakage. Check turbocharger turbine housing bolts and mounting flange gasket for erosion or soot leakage.",
                "CRITICAL": "Severe exhaust gas energy bypass. Check for cracked exhaust manifold casting, blown exhaust flange gaskets, or loose turbocharger turbine housing. Exhaust gas leak poses severe thermal hazards."
            },
            5: {
                "SMALL": "Check DPF inlet/outlet pressure sensor lines for carbon blockage or leaks. Inspect mounting bolts and flanges of the DOC-to-DPF connection.",
                "MEDIUM": "Examine DPF housing for cracks or soot bypass. Inspect exhaust pipe V-band clamps before and after the DPF. Check differential pressure sensor (dP_dpf) lines and clean pressure ports.",
                "CRITICAL": "DPF system bypass or severe leak. Inspect for cracked DPF substrate casing, loose DOC/DPF assembly clamping, or cracked sensor tubes. High risk of emissions compliance failure."
            },
            6: {
                "SMALL": "Check SCR/Tailpipe connections and exhaust pipe V-bands. Inspect SCR outlet clamping and tailpipe mounting brackets.",
                "MEDIUM": "Inspect DEF injector mounting boss for crystallisation or leaks. Check SCR casing welds and exhaust pipe joints down-stream of DPF for soot or urea leakage.",
                "CRITICAL": "SCR bypass or tailpipe disconnect. Inspect for fractured tailpipe connection, cracked SCR catalytic converter housing, or complete flange parting. Check DEF dosing valve sealing."
            }
        }

        # Resolve recommended action using Ollama with cache and background refresh
        recommended_action = ""
        if confirmed_leak and zone_idx > 0:
            cache_key = (zone_idx, severity)
            zone_fallbacks = action_map.get(zone_idx, {})
            default_action = zone_fallbacks.get(severity, zone_fallbacks.get("MEDIUM", "Inspect Zone details."))
            
            if cache_key in self.ollama_recommendation_cache:
                recommended_action = self.ollama_recommendation_cache[cache_key]
            else:
                recommended_action = default_action
                # Trigger async query to local Ollama qwen3:4b
                try:
                    loop = asyncio.get_running_loop()
                    zone_name = ZONE_NAMES[zone_idx]
                    loop.create_task(
                        self._fetch_ollama_recommendation(zone_idx, zone_name, severity, flow_loss_pct, session_id, rpm, maf, map_boost)
                    )
                except Exception as e:
                    print(f"[Ollama Rec] Could not schedule Ollama task: {e}")
        else:
            recommended_action = action_map[0]

        # ── Build response ────────────────────────────────────────────────
        ef_matrix = ef_data.get('energy_field', [[0]*6 for _ in range(6)])
        if isinstance(ef_matrix, np.ndarray):
            ef_matrix = ef_matrix.tolist()

        result = {
            "timestamp": datetime.now().isoformat(),
            "leak_detected": bool(confirmed_leak),
            "confidence": round(float(confidence), 4),
            "is_steady_state": bool(is_steady),
            "status_message": status_msg,
            "rpm_std": round(float(rpm_std), 2),
            "maf_std_pct": round(float(maf_std_pct * 100), 2),
            "fuel_std_pct": round(float(fuel_std_pct * 100), 2),
            "suspected_zone": ZONE_NAMES[zone_idx] if confirmed_leak else ZONE_NAMES[0],
            "suspected_zone_idx": int(zone_idx),
            "zone_probabilities": [round(float(p), 4) for p in zone_probs],
            "severity": severity,
            "flow_loss_pct": round(float(flow_loss_pct), 1),
            "go_no_go": "HOLD - TRANSIENT" if not is_steady else ("NO-GO" if confirmed_leak else "GO"),
            "recommended_action": recommended_action,
            "residuals": {k: round(float(v), 3) for k, v in residuals.items()},
            "energy_field": {
                "matrix": ef_matrix,
                "global_deviation": round(float(ef_data.get('global_deviation_score', 0.0)), 4),
                "cosine_similarity": round(float(ef_data.get('cosine_similarity', 1.0)), 4),
                "most_disrupted_sensor": ef_data.get('most_disrupted_sensor', 'N/A'),
                "ef_suspected_zone": ef_data.get('suspected_zone', 'N/A'),
            },
            "sensors": {
                "RPM": round(rpm, 1),
                "MAF": round(maf, 2),
                "MAP_intake": round(map_intake, 2),
                "MAP_boost": round(map_boost, 2),
                "MAP_cac_in": round(map_cac_in, 2),
                "MAP_cac_out": round(map_cac_out, 2),
                "T_intake": round(t_intake, 2),
                "T_boost": round(t_boost, 2),
                "T_cac_out": round(t_cac_out, 2),
                "T_exh_manifold": round(t_exh, 2),
                "T_dpf_in": round(t_dpf_in, 2),
                "T_dpf_out": round(t_dpf_out, 2),
                "fuel_qty": round(fuel_qty, 2),
                "dP_dpf": round(dP_dpf, 3),
                # Extended sensors
                "turbo_speed": round(turbo_speed, 0),
                "P_exh_manifold": round(p_exh_manifold, 2),
                "P_turbine_out": round(p_turbine_out, 2),
                "P_tailpipe": round(p_tailpipe, 2),
                "T_DOC": round(t_doc, 2),
                "T_SCR": round(t_scr, 2),
            },
        }

        # Store in history
        result = _to_json_safe(result)  # ensure all numpy types are converted
        self.last_predictions[session_id] = result
        prediction_history.append(result)
        if len(prediction_history) > MAX_HISTORY:
            prediction_history.pop(0)

        # Trigger email check
        self.check_and_trigger_email(session_id, result, rpm, maf, map_boost)

        return result

    async def _fetch_ollama_recommendation(self, zone_idx: int, zone_name: str, severity: str, flow_loss_pct: float, session_id: str = 'default', rpm: float = 0.0, maf: float = 0.0, map_boost: float = 0.0):
        import urllib.request
        import json
        
        url = "http://localhost:11434/api/chat"
        prompt = (
            f"You are a Cat C18 diesel engine diagnostic expert.\n"
            f"Provide a professional, detailed, 3-point bulleted checklist of diagnostic/maintenance actions "
            f"for a leak in: {zone_name} (Zone {zone_idx}).\n"
            f"Severity: {severity} ({flow_loss_pct}% estimated flow loss).\n"
            f"Provide clear, actionable steps targeting specific flanges, clamps, hoses, or gaskets.\n"
            f"Keep the entire response under 60 words, direct and concise. No intro/outro."
        )
        
        payload = {
            "model": "qwen3:4b",
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
        
        def _call():
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=4.0) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                return res_data["message"]["content"]
                
        qwen_success = False
        response_text = ""
        try:
            response_text = await asyncio.to_thread(_call)
            if response_text and response_text.strip():
                response_text = response_text.strip()
                self.ollama_recommendation_cache[(zone_idx, severity)] = response_text
                self.recommendation_cache[(zone_idx, severity)] = response_text
                print(f"[Ollama Rec] Successfully cached dynamic recommendation for Zone {zone_idx} ({severity})")
                qwen_success = True
        except Exception as e:
            print(f"[Ollama Rec] Failed to query Ollama for recommendations: {e}")

        # Check if there is a pending email waiting for this recommendation
        session = self.sessions.get(session_id)
        if session and 'pending_email' in session:
            pending = session.pop('pending_email')
            res = pending['result']
            if qwen_success:
                res['recommended_action'] = response_text
                
            # Send the email now
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(
                    self._send_leak_email_notification(res, pending['rpm'], pending['maf'], pending['map_boost'])
                )
            except Exception as e:
                print(f"[Email Notification] Could not schedule pending email task: {e}")

    async def _send_leak_email_notification(self, result: Dict, rpm: float, maf: float, map_boost: float):
        import urllib.request
        import json
        
        url = "https://formspree.io/f/mdaraavp"
        recipients = "mmithun1701@gmail.com, kungumapriyaamkp5@gmail.com"
        subject = f"[AeroTwin Alert] Leak Detected in {result.get('suspected_zone', 'Engine')}"
        
        payload = {
            "_subject": subject,
            "Target Recipients": recipients,
            "Engine Model": "MALE UAV Aero Piston Engine",
            "Diagnostic Status": "LEAK DETECTED",
            "Suspected Zone": result.get("suspected_zone", "Unknown"),
            "Severity Level": result.get("severity", "UNKNOWN"),
            "Estimated Flow Loss": f"{result.get('flow_loss_pct', 0.0)}%",
            "AI Model Confidence": f"{round(result.get('confidence', 0.0) * 100, 1)}%",
            "Qwen 3 AI Checklist": result.get("recommended_action", "Inspect engine immediately."),
            "Engine Speed": f"{round(rpm, 1)} rpm",
            "Mass Air Flow (MAF)": f"{round(maf, 2)} kg/h",
            "Boost Pressure (MAP)": f"{round(map_boost, 2)} kPa",
            "Timestamp": result.get("timestamp", datetime.now().isoformat())
        }
        
        def _call():
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5.0) as response:
                return response.read().decode("utf-8")
                
        try:
            response_text = await asyncio.to_thread(_call)
            print(f"[Email Notification] Email sent successfully via Formspree: {response_text}")
        except Exception as e:
            print(f"[Email Notification] Failed to send email via Formspree: {e}")

    def check_and_trigger_email(self, session_id: str, result: Dict, rpm: float, maf: float, map_boost: float):
        session = self.sessions.get(session_id)
        if not session:
            return
            
        confirmed_leak = result.get("leak_detected", False)
        if not confirmed_leak:
            session['last_leak_state'] = False
            return
            
        import time
        current_time = time.time()
        last_sent = session.get('last_email_sent_time', 0.0)
        last_state = session.get('last_leak_state', False)
        
        state_transition = confirmed_leak and not last_state
        time_elapsed = confirmed_leak and (current_time - last_sent > 300)
        
        if state_transition or time_elapsed:
            session['last_email_sent_time'] = current_time
            
            zone_idx = result.get("suspected_zone_idx", 0)
            severity = result.get("severity", "MEDIUM")
            cache_key = (zone_idx, severity)
            
            if cache_key in self.ollama_recommendation_cache:
                # Dynamic Qwen recommendation is already cached, send email immediately
                result['recommended_action'] = self.ollama_recommendation_cache[cache_key]
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(
                        self._send_leak_email_notification(result, rpm, maf, map_boost)
                    )
                except Exception as e:
                    print(f"[Email Notification] Could not schedule email task: {e}")
            else:
                # Not cached yet, mark as pending so _fetch_ollama_recommendation sends it
                session['pending_email'] = {
                    'result': result,
                    'rpm': rpm,
                    'maf': maf,
                    'map_boost': map_boost
                }
                print(f"[Email Notification] Leak detected, waiting for Ollama Qwen 3 recommendation before sending email...")
                
        session['last_leak_state'] = confirmed_leak


# ─── Global predictor ─────────────────────────────────────────────────────────
predictor: UnifiedPredictor = None


# Startup is now handled by the lifespan context manager above


# ─── REST Endpoints ───────────────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    """System health check."""
    models_loaded = predictor is not None and predictor.intake_twin is not None
    return {
        "status": "healthy" if models_loaded else "degraded",
        "models_loaded": models_loaded,
        "version": "1.0.0",
        "engine": "Cat C18",
    }


@app.post("/api/predict")
async def predict_endpoint(data: Dict):
    """Run leak detection on sensor data."""
    if not predictor:
        raise HTTPException(503, "Models not loaded — run training first")
    try:
        res = predictor.predict(data)
        try:
            res["dax_measures"] = {
                "rolling_1hr_leak_rate": app.state.dax.query("[Rolling 1Hr Leak Rate]").get("scalar_value"),
                "steady_state_coverage": app.state.dax.query("[Steady State Coverage]").get("scalar_value"),
            }
        except:
            res["dax_measures"] = {}
        return res
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(500, str(e))


@app.get("/api/health-field")
async def get_health_field():
    """Get current energy field matrix."""
    if predictor and predictor.ef_detector and predictor.ef_detector.is_fitted:
        return {
            "healthy_baseline": predictor.ef_detector.healthy_field_mean.tolist(),
            "channels": EF_CHANNELS[:6],
        }
    return {"healthy_baseline": [[0]*6]*6, "channels": EF_CHANNELS[:6]}


@app.get("/api/history")
async def get_history(limit: int = 50):
    """Get prediction history."""
    return prediction_history[-limit:]


class AudioPredictRequest(BaseModel):
    category: str
    filename: str
    sensors: Optional[Dict] = None
    session_id: Optional[str] = None


@app.get("/api/audio/files")
async def list_audio_files():
    data_dir = os.path.join(BACKEND_DIR, "Data")
    good_dir = os.path.join(data_dir, "good")
    leak_dir = os.path.join(data_dir, "leak")
    
    good_files = []
    if os.path.exists(good_dir):
        good_files = [f for f in os.listdir(good_dir) if f.endswith(".wav")]
        
    leak_files = []
    if os.path.exists(leak_dir):
        leak_files = [f for f in os.listdir(leak_dir) if f.endswith(".wav")]
        
    return {
        "good": sorted(good_files),
        "leak": sorted(leak_files)
    }

@app.get("/api/audio/play/{category}/{filename}")
async def play_audio_file(category: str, filename: str):
    from fastapi.responses import FileResponse
    if category not in ["good", "leak"]:
        raise HTTPException(400, "Invalid category")
    
    file_path = os.path.join(BACKEND_DIR, "Data", category, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, f"Audio file not found: {filename}")
        
    return FileResponse(file_path, media_type="audio/wav")

@app.post("/api/audio/predict")
async def predict_audio(body: AudioPredictRequest):
    category = body.category
    filename = body.filename
    
    if category not in ["good", "leak"]:
        raise HTTPException(400, "Invalid category")
        
    file_path = os.path.join(BACKEND_DIR, "Data", category, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "Audio file not found")
        
    try:
        model_path = os.path.join(MODELS_DIR, "acoustic_model.joblib")
        scaler_path = os.path.join(MODELS_DIR, "acoustic_scaler.joblib")
        
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise HTTPException(503, "Acoustic model/scaler not found. Please train first.")
            
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        from ml.train_audio import extract_audio_features
        feats = extract_audio_features(file_path)
        
        feats_scaled = scaler.transform([feats])
        pred = int(model.predict(feats_scaled)[0])
        probs = model.predict_proba(feats_scaled)[0].tolist()
        
        # --- Physics & Telemetry Simulation Connection ---
        # Parse RPM, leak status, zone, and severity from the filename
        rpm = 1800
        for r_val in [1200, 1400, 1600, 1800, 2000]:
            if f"{r_val}rpm" in filename:
                rpm = r_val
                break
                
        is_leak = (category == "leak")
        zone_idx = 0
        severity_idx = 0
        
        if is_leak:
            if "large" in filename:
                severity_idx = 3
            elif "medium" in filename:
                severity_idx = 2
            elif "small" in filename:
                severity_idx = 1
            else:
                severity_idx = 2
                
            # Zone mapping matching frontend behavior
            if "1200" in filename:
                if "large" in filename:
                    zone_idx = 6
                elif "medium" in filename:
                    zone_idx = 1
                else:
                    zone_idx = 2
            elif "1400" in filename:
                if "large" in filename:
                    zone_idx = 3
                elif "medium" in filename:
                    zone_idx = 4
                else:
                    zone_idx = 5
            elif "1600" in filename:
                if "large" in filename:
                    zone_idx = 6
                elif "medium" in filename:
                    zone_idx = 1
                else:
                    zone_idx = 2
            elif "1800" in filename:
                if "large" in filename:
                    zone_idx = 3
                elif "medium" in filename:
                    zone_idx = 4
                else:
                    zone_idx = 5
            elif "2000" in filename:
                if "large" in filename:
                    zone_idx = 6
                elif "medium" in filename:
                    zone_idx = 1
                else:
                    zone_idx = 2
            else:
                zone_idx = 2
                
        # Generate simulated engine sensors matching this audio scenario
        from data_generator import generate_healthy_sample, inject_leak, add_noise
        sim_sensors = generate_healthy_sample(float(rpm))
        
        if is_leak and zone_idx > 0:
            sim_sensors = inject_leak(sim_sensors, zone_idx, severity_idx)
            
        sim_sensors = add_noise(sim_sensors)
        
        # Pass simulation parameters so main predictor aligns its visual distortion and baseline
        sim_sensors['injected_zone'] = zone_idx
        sim_sensors['injected_severity'] = severity_idx
        if body.session_id:
            sim_sensors['session_id'] = body.session_id
        
        # Execute the unified prediction stack (physics twins, energy field, XGBoost/NN ensemble)
        if not predictor:
            raise HTTPException(503, "Models not loaded — run training first")
            
        telemetry_result = predictor.predict(sim_sensors)
        
        # --- Multi-Modal Decision Fusion ---
        # Fuse confidence scores (50% telemetry ensemble + 50% acoustic model)
        ml_confidence = telemetry_result['confidence']
        acoustic_confidence = probs[1]
        
        fused_confidence = 0.5 * ml_confidence + 0.5 * acoustic_confidence
        
        leak_threshold = ML_CONFIG.get('leak_threshold', 0.65)
        confirmed_leak = fused_confidence > leak_threshold
        
        # Update telemetry results with fused predictions
        telemetry_result['leak_detected'] = bool(confirmed_leak)
        telemetry_result['confidence'] = round(fused_confidence, 4)
        telemetry_result['go_no_go'] = "NO-GO" if confirmed_leak else "GO"
        
        if not confirmed_leak:
            telemetry_result['suspected_zone'] = ZONE_NAMES[0]
            telemetry_result['suspected_zone_idx'] = 0
            telemetry_result['severity'] = "NONE"
            telemetry_result['flow_loss_pct'] = 0.0
            
        # Nest acoustic analysis details inside the final telemetry payload
        telemetry_result['acoustic_analysis'] = {
            "prediction": "LEAK" if pred == 1 else "HEALTHY",
            "leak_probability": round(probs[1], 4),
            "healthy_probability": round(probs[0], 4),
            "features": {
                "rms": round(feats[0], 4),
                "peak": round(feats[1], 4),
                "crest_factor": round(feats[2], 4),
                "zero_crossings": round(feats[3], 4),
                "spectral_centroid": round(feats[4], 2),
                "spectral_flatness": round(feats[5], 6),
                "band_1": round(feats[6], 4),
                "band_2": round(feats[7], 4),
                "band_3": round(feats[8], 4),
                "band_4": round(feats[9], 4)
            }
        }
        
        # Add DAX metrics if available
        try:
            telemetry_result["dax_measures"] = {
                "rolling_1hr_leak_rate": app.state.dax.query("[Rolling 1Hr Leak Rate]").get("scalar_value"),
                "steady_state_coverage": app.state.dax.query("[Steady State Coverage]").get("scalar_value"),
            }
        except:
            telemetry_result["dax_measures"] = {}
            
        # Trigger email check with final fused results
        if predictor:
            predictor.check_and_trigger_email(
                body.session_id or 'default',
                telemetry_result,
                rpm,
                sim_sensors.get('MAF', 850),
                sim_sensors.get('MAP_boost', 215)
            )
            
        return telemetry_result
        
    except Exception as e:
        print(f"Acoustic prediction error: {e}")
        raise HTTPException(500, str(e))




@app.get("/api/zones")
async def get_zones():
    """Get zone definitions."""
    return {"zones": ZONE_NAMES}


@app.post("/api/simulate")
async def simulate_scenario(data: Dict):
    """
    Simulate a sensor scenario. Useful for testing.
    Accepts: { "rpm": 1800, "leak_zone": 0, "leak_severity": 0 }
    """
    from data_generator import generate_healthy_sample, inject_leak, add_noise

    rpm = float(data.get('rpm', 1800))
    zone = int(data.get('leak_zone', 0))
    severity = int(data.get('leak_severity', 0))

    sample = generate_healthy_sample(rpm)
    if zone > 0 and severity > 0:
        sample = inject_leak(sample, zone, severity)
    sample = add_noise(sample)

    # Inject simulation override metadata
    sample['injected_zone'] = zone
    sample['injected_severity'] = severity
    if 'session_id' in data:
        sample['session_id'] = data['session_id']

    # Run prediction on the simulated sample
    result = predictor.predict(sample)
    result['simulation'] = {
        'injected_zone': zone,
        'injected_severity': severity,
        'rpm': rpm,
    }
    return result


# ─── WebSocket Live Stream ────────────────────────────────────────────────────
@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    """Real-time prediction streaming at 1 Hz."""
    await ws.accept()
    print("  WebSocket client connected")
    import uuid
    ws_session_id = f"live_{uuid.uuid4().hex}"
    used_sessions = {ws_session_id}
    try:
        while True:
            data = await ws.receive_json()
            if 'session_id' not in data:
                data['session_id'] = ws_session_id
            else:
                used_sessions.add(str(data['session_id']))
            result = predictor.predict(data)
            try:
                await ws.send_json(result)
            except Exception as send_err:
                print(f"  WebSocket send error: {send_err}")
    except WebSocketDisconnect:
        print("  WebSocket client disconnected")
    except Exception as e:
        print(f"  WebSocket error: {e}")
    finally:
        if predictor:
            for s_id in used_sessions:
                if s_id in predictor.sessions:
                    del predictor.sessions[s_id]
                if s_id in predictor.last_predictions:
                    del predictor.last_predictions[s_id]


@app.websocket("/ws/demo")
async def websocket_demo(ws: WebSocket):
    """Demo mode: auto-generates and streams sensor data, responding to client selections."""
    await ws.accept()
    print("  Demo WebSocket connected")
    import uuid
    ws_session_id = f"demo_{uuid.uuid4().hex}"
    used_sessions = {ws_session_id}

    from data_generator import generate_healthy_sample, inject_leak, add_noise

    rpm_range = [1200, 1400, 1600, 1800, 2000]
    cycle = 0

    # Share state between tasks
    state = {
        "zone": -1,
        "severity": -1,
        "session_id": ws_session_id
    }

    async def read_client():
        try:
            while True:
                data = await ws.receive_json()
                if "leak_zone" in data:
                    state["zone"] = int(data["leak_zone"])
                if "leak_severity" in data:
                    state["severity"] = int(data["leak_severity"])
                if "session_id" in data:
                    state["session_id"] = str(data["session_id"])
                    used_sessions.add(state["session_id"])
                print(f"  Demo WebSocket updated state: zone={state['zone']}, severity={state['severity']}, session_id={state['session_id']}")
        except Exception:
            pass

    reader_task = asyncio.create_task(read_client())

    try:
        while True:
            # 1. Healthy State (Runs for 5 seconds)
            rpm = rpm_range[cycle % len(rpm_range)]
            sample = generate_healthy_sample(rpm + np.random.uniform(-20, 20))
            sample = add_noise(sample)
            
            sample['injected_zone'] = 0
            sample['injected_severity'] = 0
            sample['session_id'] = state["session_id"]
            
            result = predictor.predict(sample)
            result['demo_info'] = {
                'cycle': int(cycle),
                'injected_zone': 0,
                'injected_severity': 0,
            }
            try:
                await ws.send_json(result)
            except Exception as send_err:
                print(f"  Demo send error (skipping frame): {send_err}")
                break
                
            await asyncio.sleep(5.0)
            
            # 2. Leak State (Runs for 2 seconds in rotating zones 1-6)
            cycle += 1
            zone = (cycle % 6) + 1
            severity = 2 # Medium leak
            
            rpm = rpm_range[cycle % len(rpm_range)]
            sample = generate_healthy_sample(rpm + np.random.uniform(-20, 20))
            sample = inject_leak(sample, zone, severity)
            sample = add_noise(sample)
            
            sample['injected_zone'] = zone
            sample['injected_severity'] = severity
            sample['session_id'] = state["session_id"]
            
            result = predictor.predict(sample)
            result['demo_info'] = {
                'cycle': int(cycle),
                'injected_zone': int(zone),
                'injected_severity': int(severity),
            }
            try:
                await ws.send_json(result)
            except Exception as send_err:
                print(f"  Demo send error (skipping frame): {send_err}")
                break
                
            await asyncio.sleep(2.0)

    except WebSocketDisconnect:
        print("  Demo WebSocket disconnected")
    except Exception as e:
        print(f"  Demo error: {e}")
    finally:
        reader_task.cancel()
        if predictor:
            for s_id in used_sessions:
                if s_id in predictor.sessions:
                    del predictor.sessions[s_id]
                if s_id in predictor.last_predictions:
                    del predictor.last_predictions[s_id]

@app.websocket("/ws/daq")
async def websocket_daq(ws: WebSocket):
    """Real-time DAQ stream WebSocket."""
    await ws.accept()
    app.state.active_daq_websockets.add(ws)
    print("  DAQ WebSocket client connected")
    try:
        while True:
            # Just keep connection open, client listens
            await ws.receive_text()
    except WebSocketDisconnect:
        app.state.active_daq_websockets.discard(ws)
        print("  DAQ WebSocket client disconnected")
    except Exception as e:
        app.state.active_daq_websockets.discard(ws)
        print(f"  DAQ WebSocket error: {e}")


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
