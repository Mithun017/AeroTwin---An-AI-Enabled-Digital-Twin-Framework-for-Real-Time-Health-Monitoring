"""
engine_model.py — Physics-Informed 4-Stroke Piston Engine Model

Computes expected sensor readings for given operating conditions using
simplified thermodynamic equations + quadratic polynomial performance maps.

PHYSICS_CONSTANTS is the hash target for cache invalidation (see trainer.py).
If you change any value here, the model cache auto-invalidates on next startup.
"""
from __future__ import annotations
import numpy as np
from schemas import OperatingCondition, PredictedValues

# ---------------------------------------------------------------------------
# PHYSICS_CONSTANTS — dict of all model coefficients.
# Used by trainer._config_hash() as the cache invalidation target.
# Change any value here → cache auto-invalidates → models retrain once.
# ---------------------------------------------------------------------------
PHYSICS_CONSTANTS: dict = {
    # RPM model: base_rpm + throttle_effect - altitude_penalty
    "rpm_base": 1800.0,
    "rpm_throttle_coeff": 35.0,       # RPM per % throttle
    "rpm_altitude_coeff": -0.08,      # RPM per metre altitude (negative = less air)
    "rpm_altitude_sq":   1.2e-6,      # quadratic correction

    # CHT model: Cylinder Head Temperature (°C)
    "cht_base": 110.0,
    "cht_throttle_coeff": 1.05,
    "cht_altitude_coeff": -0.005,
    "cht_ambient_coeff": 0.7,

    # EGT model: Exhaust Gas Temperature (°C)
    "egt_base": 450.0,
    "egt_throttle_coeff": 2.8,
    "egt_altitude_coeff": 0.012,
    "egt_ambient_coeff": 0.9,

    # Oil pressure (bar)
    "oil_p_base": 4.5,
    "oil_p_rpm_coeff": 0.00035,
    "oil_p_temp_coeff": -0.008,       # hot oil → lower viscosity → lower pressure

    # Oil temperature (°C)
    "oil_t_base": 70.0,
    "oil_t_throttle_coeff": 0.55,
    "oil_t_ambient_coeff": 0.4,

    # Fuel flow (L/hr)
    "ff_base": 3.5,
    "ff_throttle_coeff": 0.19,
    "ff_altitude_coeff": -0.0004,

    # Vibration (g RMS)
    "vib_base": 0.18,
    "vib_rpm_coeff": 2.8e-5,
    "vib_sq_coeff": 1.2e-9,

    # Battery voltage (V) — relatively stable, slight load drop with RPM
    "batt_base": 28.0,
    "batt_rpm_coeff": -0.0001,

    # Injection timing (degrees BTDC)
    "inj_base": 12.0,
    "inj_throttle_coeff": 0.06,
    "inj_altitude_coeff": 0.001,

    # Altitude density correction
    "alt_density_scale": 8500.0,      # scale height (m) for ISA approximation
}

# Operating condition validity bounds — clamp and flag out-of-range
_BOUNDS = {
    "throttle_pct": (0.0, 100.0),
    "altitude_m":   (0.0, 8000.0),
    "ambient_temp_c": (-40.0, 55.0),
}


class PhysicsEngineModel:
    """
    Predicts expected sensor values for a given operating condition.
    All equations are closed-form polynomial maps — deterministic and fast (<5ms).
    """

    def __init__(self):
        self._c = PHYSICS_CONSTANTS

    def _clamp_condition(
        self, cond: OperatingCondition
    ) -> tuple[OperatingCondition, bool]:
        """Clamp operating condition to model validity bounds."""
        extrapolated = False
        thr = float(np.clip(cond.throttle_pct, *_BOUNDS["throttle_pct"]))
        alt = float(np.clip(cond.altitude_m,   *_BOUNDS["altitude_m"]))
        tmp = float(np.clip(cond.ambient_temp_c, *_BOUNDS["ambient_temp_c"]))
        if thr != cond.throttle_pct or alt != cond.altitude_m or tmp != cond.ambient_temp_c:
            extrapolated = True
        return OperatingCondition(
            throttle_pct=thr, altitude_m=alt, ambient_temp_c=tmp
        ), extrapolated

    def predict(
        self, cond: OperatingCondition
    ) -> tuple[PredictedValues, bool]:
        """
        Returns (PredictedValues, model_extrapolated).
        model_extrapolated=True means operating condition was clamped.
        """
        cond, extrapolated = self._clamp_condition(cond)
        c = self._c
        thr = cond.throttle_pct
        alt = cond.altitude_m
        tmp = cond.ambient_temp_c

        # Air density correction (ISA approximation)
        rho_ratio = np.exp(-alt / c["alt_density_scale"])

        # --- RPM ---
        rpm = (
            c["rpm_base"]
            + c["rpm_throttle_coeff"] * thr
            + c["rpm_altitude_coeff"] * alt
            + c["rpm_altitude_sq"] * alt**2
        ) * rho_ratio
        rpm = max(rpm, 800.0)

        # --- CHT ---
        cht = (
            c["cht_base"]
            + c["cht_throttle_coeff"] * thr
            + c["cht_altitude_coeff"] * alt
            + c["cht_ambient_coeff"] * tmp
        )

        # --- EGT ---
        egt = (
            c["egt_base"]
            + c["egt_throttle_coeff"] * thr
            + c["egt_altitude_coeff"] * alt
            + c["egt_ambient_coeff"] * tmp
        )

        # --- Oil pressure ---
        oil_temp_pred = (
            c["oil_t_base"]
            + c["oil_t_throttle_coeff"] * thr
            + c["oil_t_ambient_coeff"] * tmp
        )
        oil_pressure = max(
            0.5,
            c["oil_p_base"]
            + c["oil_p_rpm_coeff"] * rpm
            + c["oil_p_temp_coeff"] * oil_temp_pred,
        )

        # --- Fuel flow ---
        fuel_flow = max(
            0.5,
            c["ff_base"]
            + c["ff_throttle_coeff"] * thr
            + c["ff_altitude_coeff"] * alt,
        )

        # --- Vibration ---
        vibration = max(
            0.0,
            c["vib_base"]
            + c["vib_rpm_coeff"] * rpm
            + c["vib_sq_coeff"] * rpm**2,
        )

        # --- Battery voltage ---
        battery_voltage = max(
            22.0, c["batt_base"] + c["batt_rpm_coeff"] * rpm
        )

        # --- Injection timing ---
        injection_timing = (
            c["inj_base"]
            + c["inj_throttle_coeff"] * thr
            + c["inj_altitude_coeff"] * alt
        )

        return PredictedValues(
            rpm=round(rpm, 1),
            cht=round(cht, 1),
            egt=round(egt, 1),
            oil_pressure=round(oil_pressure, 3),
            oil_temp=round(oil_temp_pred, 1),
            fuel_flow=round(fuel_flow, 2),
            vibration=round(vibration, 4),
            battery_voltage=round(battery_voltage, 2),
            injection_timing=round(injection_timing, 2),
        ), extrapolated
