"""
scenarios.py — Fault scenarios for the synthetic telemetry generator.

FaultClass is imported from schemas.py — the single source of truth.
All fault strings here are plain string literals validated by Pydantic at
MLOutput / ScenarioControlRequest construction time, not at dict-definition time.
"""
from __future__ import annotations
from schemas import FaultClass   # noqa: F401  — imported for type annotations

# ---------------------------------------------------------------------------
# SCENARIOS — used by _config_hash() as the cache invalidation target.
# Change fault definitions → model cache auto-invalidates → retrains once.
# ---------------------------------------------------------------------------
SCENARIOS: dict[str, dict] = {
    "normal_flight": {
        "fault": None,
        "channels": [],
        "description": "Nominal flight — no fault injected",
    },
    "misfire_onset": {
        "fault": "misfire",
        "channels": ["rpm", "egt", "vibration"],
        "mode": "ramp",
        "description": "Misfiring cylinder — rough running, EGT spike, vibration rise",
        # residual offsets at full severity (normalised units per channel)
        "offsets": {"rpm": -120, "egt": 85, "vibration": 0.55},
    },
    "overheating_trend": {
        "fault": "overheating",
        "channels": ["cht", "egt", "oil_temp"],
        "mode": "ramp",
        "description": "Progressive overheating — CHT/EGT/oil temp all rising",
        "offsets": {"cht": 55, "egt": 70, "oil_temp": 22},
    },
    "sensor_drift": {
        "fault": "sensor_drift",
        "channels": ["rpm", "oil_pressure"],
        "mode": "ramp",
        "description": "Slow sensor calibration drift — RPM and oil pressure biased",
        "offsets": {"rpm": -80, "oil_pressure": -0.9},
    },
    "cooling_degradation": {
        "fault": "cooling_degradation",
        "channels": ["cht", "oil_temp"],
        "mode": "ramp",
        "description": "Cooling system degradation — elevated CHT and oil temp",
        "offsets": {"cht": 42, "oil_temp": 18},
    },
    "lubrication_issue": {
        "fault": "lubrication_issue",
        "channels": ["oil_pressure", "oil_temp", "vibration"],
        "mode": "ramp",
        "description": "Oil starvation / lubrication degradation",
        "offsets": {"oil_pressure": -1.6, "oil_temp": 25, "vibration": 0.30},
    },
    "injector_abnormality": {
        "fault": "injector_abnormality",
        "channels": ["fuel_flow", "egt", "rpm"],
        "mode": "ramp",
        "description": "Injector fouling / stuck-open — fuel flow and EGT abnormal",
        "offsets": {"fuel_flow": 3.8, "egt": 60, "rpm": -60},
    },
    "abnormal_vibration": {
        "fault": "abnormal_vibration",
        "channels": ["vibration", "rpm"],
        "mode": "ramp",
        "description": "Structural vibration anomaly — high vibration signature",
        "offsets": {"vibration": 0.9, "rpm": -40},
    },
}

# Demo presets — rapid injection for live demos
DEMO_SEQUENCES = [
    ("normal_flight",       20),   # 20 ticks normal
    ("misfire_onset",       40),   # then misfire
    ("normal_flight",       10),   # brief recovery
    ("overheating_trend",   40),   # then overheating
]
