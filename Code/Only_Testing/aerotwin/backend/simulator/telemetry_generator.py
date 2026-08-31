"""
telemetry_generator.py — Synthetic Telemetry Generator

Produces smooth, continuous, realistic sensor streams with organic flight dynamics.
Supports fault injection via SCENARIOS with ramp (realistic) or instant (demo) modes.
"""
from __future__ import annotations
import time
import uuid
import random
import threading
from datetime import datetime, timezone

import numpy as np
from schemas import (
    RawTelemetryPacket, OperatingCondition, SensorReading, SENSOR_FIELDS
)
from physics.engine_model import PhysicsEngineModel
from simulator.scenarios import SCENARIOS
import config

# ---------------------------------------------------------------------------
# Realistic Sensor noise parameters (Gaussian σ per channel)
# AR(1) autocorrelation coefficient: high correlation = smooth continuous signal
# ---------------------------------------------------------------------------
_NOISE_SIGMA = {
    "rpm": 4.0, "cht": 0.3, "egt": 0.8,
    "oil_pressure": 0.015, "oil_temp": 0.2,
    "fuel_flow": 0.03, "vibration": 0.003,
    "battery_voltage": 0.02, "injection_timing": 0.03,
}
_AR1_COEFF = 0.88   # temporal low-pass smoothing for continuous realistic telemetry


class TelemetryGenerator:
    """
    Stateful generator — maintains smooth operating condition, active scenario,
    fault ramp progress, and continuous flight dynamics.
    """

    def __init__(self):
        self._model = PhysicsEngineModel()
        self._mission_id = f"sim-{uuid.uuid4().hex[:8]}"
        self._lock = threading.Lock()
        self._start_time = time.time()

        # Base Operating condition
        self._base_throttle = 65.0
        self._base_altitude = 2500.0
        self._base_ambient = 20.0

        # Active scenario state
        self._scenario_name = config.DEFAULT_SCENARIO
        self._fault_mode = config.DEFAULT_FAULT_MODE
        self._ramp_tick = 0
        self._ramp_ticks_total = 50   # ~10s at 5Hz to reach full severity

        # AR(1) noise state
        self._noise_state: dict[str, float] = {k: 0.0 for k in SENSOR_FIELDS}

    # ── Public API ──────────────────────────────────────────────────────────

    def set_scenario(self, scenario_name: str, mode: str = "ramp") -> None:
        with self._lock:
            if scenario_name not in SCENARIOS:
                raise ValueError(f"Unknown scenario: {scenario_name}")
            self._scenario_name = scenario_name
            self._fault_mode = mode
            self._ramp_tick = 0
            self._mission_id = f"sim-{uuid.uuid4().hex[:8]}"

    def set_operating_condition(self, cond: OperatingCondition) -> None:
        with self._lock:
            self._base_throttle = cond.throttle_pct
            self._base_altitude = cond.altitude_m
            self._base_ambient = cond.ambient_temp_c

    def get_mission_id(self) -> str:
        return self._mission_id

    def next_tick(self) -> RawTelemetryPacket:
        """Generate one continuous telemetry tick. Thread-safe."""
        with self._lock:
            return self._generate_tick()

    # ── Internal ────────────────────────────────────────────────────────────

    def _generate_tick(self) -> RawTelemetryPacket:
        t = time.time() - self._start_time
        scenario = SCENARIOS[self._scenario_name]
        fault = scenario.get("fault")
        offsets = scenario.get("offsets", {})

        # Organic flight dynamics — smooth sinusoidal breathing in cruise
        smooth_throttle = self._base_throttle + 1.2 * np.sin(t / 6.0) + 0.4 * np.cos(t / 2.5)
        smooth_throttle = float(np.clip(smooth_throttle, 10.0, 100.0))

        smooth_altitude = self._base_altitude + 5.0 * np.sin(t / 20.0)
        cond = OperatingCondition(
            throttle_pct=round(smooth_throttle, 2),
            altitude_m=round(smooth_altitude, 1),
            ambient_temp_c=self._base_ambient,
        )

        # Compute physics-predicted baseline
        predicted, _ = self._model.predict(cond)

        # Severity ramp [0.0 → 1.0]
        if fault is None:
            severity_factor = 0.0
        elif self._fault_mode == "instant":
            severity_factor = 1.0
        else:
            self._ramp_tick = min(self._ramp_tick + 1, self._ramp_ticks_total)
            severity_factor = self._ramp_tick / self._ramp_ticks_total

        # Build sensor dict from predicted values + AR(1) smooth noise + fault offsets
        pred_dict = predicted.model_dump()
        sensors_raw: dict[str, float] = {}
        for field in SENSOR_FIELDS:
            base = pred_dict[field]

            # AR(1) low-pass noise filter for smooth continuous telemetry
            white = random.gauss(0, _NOISE_SIGMA[field])
            self._noise_state[field] = (
                _AR1_COEFF * self._noise_state[field] + (1.0 - _AR1_COEFF) * white
            )
            noise = self._noise_state[field]

            # Fault perturbation offset
            fault_perturbation = offsets.get(field, 0.0) * severity_factor

            sensors_raw[field] = round(base + noise + fault_perturbation, 4)

        # Clamp physically impossible values
        sensors_raw["rpm"]             = max(0.0, sensors_raw["rpm"])
        sensors_raw["cht"]             = max(0.0, sensors_raw["cht"])
        sensors_raw["oil_pressure"]    = max(0.0, sensors_raw["oil_pressure"])
        sensors_raw["battery_voltage"] = max(0.0, sensors_raw["battery_voltage"])

        return RawTelemetryPacket(
            timestamp=datetime.now(timezone.utc).isoformat(),
            mission_id=self._mission_id,
            operating_condition=cond,
            sensors=SensorReading(**sensors_raw),
            injected_fault=fault,
        )


# Module-level singleton
_generator = TelemetryGenerator()

def next_tick() -> RawTelemetryPacket:
    return _generator.next_tick()

def set_scenario(name: str, mode: str = "ramp") -> None:
    _generator.set_scenario(name, mode)

def get_mission_id() -> str:
    return _generator.get_mission_id()

def reset_mission() -> str:
    _generator.set_scenario(config.DEFAULT_SCENARIO)
    return _generator.get_mission_id()
