"""
explainability.py — XAI layer: ranks which residual channels drove an anomaly.

Uses residual-magnitude ranking (fast, <1ms).
SHAP available as opt-in via explain_deep() for offline analysis.
"""
from __future__ import annotations
import numpy as np
from schemas import ResidualVector, SENSOR_FIELDS

# Normalisation factors (typical max absolute residual per channel in fault states)
_NORM_FACTORS = {
    "rpm": 200.0, "cht": 80.0, "egt": 120.0,
    "oil_pressure": 2.0, "oil_temp": 40.0,
    "fuel_flow": 5.0, "vibration": 1.0,
    "battery_voltage": 2.0, "injection_timing": 3.0,
}


def rank_contributors(residual: ResidualVector, top_n: int = 3) -> list[str]:
    """
    Returns top_n residual channel names ranked by normalised absolute magnitude.
    This is the primary XAI mechanism used in the live loop (<1ms per tick).
    """
    values = residual.as_array()
    scored = []
    for field, val in zip(SENSOR_FIELDS, values):
        norm = abs(val) / _NORM_FACTORS.get(field, 1.0)
        scored.append((field, norm))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [f for f, _ in scored[:top_n]]


def explain_deep(residual: ResidualVector, classifier_model, top_n: int = 3) -> list[str]:
    """
    SHAP-based explanation — use for offline analysis, not in the live loop.
    Falls back to rank_contributors if SHAP is unavailable.
    """
    try:
        import shap
        arr = np.array(residual.as_array()).reshape(1, -1)
        explainer = shap.TreeExplainer(classifier_model)
        shap_vals = explainer.shap_values(arr)
        mean_abs = np.mean(np.abs(shap_vals), axis=0)
        if mean_abs.ndim > 1:
            mean_abs = mean_abs.mean(axis=0)
        idxs = np.argsort(mean_abs)[::-1][:top_n]
        return [SENSOR_FIELDS[i] for i in idxs if i < len(SENSOR_FIELDS)]
    except Exception:
        return rank_contributors(residual, top_n)
