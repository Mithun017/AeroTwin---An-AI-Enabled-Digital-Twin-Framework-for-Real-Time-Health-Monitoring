"""
pipeline.py — Per-tick processing pipeline.

Strict sequence (matches workflow.md §2):
  1. Validate raw packet → RawTelemetryPacket
  2. physics_model.predict(operating_condition) → PredictedValues
  3. residual = sensors - predicted → ResidualVector
  4. health_engine.predict(residual) → MLOutput
  5. Severity routing
  6. Persist to DB
  7. Return EnrichedTick dict for WebSocket broadcast
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone

from schemas import (
    RawTelemetryPacket, ResidualVector, EnrichedTick,
    AlertMessage, Severity, SENSOR_FIELDS
)
from physics.engine_model import PhysicsEngineModel
from ml import health_engine
from db import database

log = logging.getLogger("aerotwin.pipeline")

_physics = PhysicsEngineModel()

# Severity thresholds on anomaly_score
_SEVERITY_THRESHOLDS = {
    "critical": 0.85,
    "high":     0.70,
    "medium":   0.55,
    "low":      0.35,
}

_alert_counter = 0


def _compute_residual(sensors: dict, predicted: dict) -> ResidualVector:
    res = {f: round(sensors[f] - predicted[f], 6) for f in SENSOR_FIELDS}
    return ResidualVector(**res)


def _severity_from_score(score: float) -> str:
    if score >= _SEVERITY_THRESHOLDS["critical"]:
        return "critical"
    if score >= _SEVERITY_THRESHOLDS["high"]:
        return "high"
    if score >= _SEVERITY_THRESHOLDS["medium"]:
        return "medium"
    if score >= _SEVERITY_THRESHOLDS["low"]:
        return "low"
    return "normal"


def _build_alert(tick: dict, ml) -> AlertMessage | None:
    if ml is None or ml.anomaly_score < 0.50 or ml.fault_class == "none":
        return None
    global _alert_counter
    _alert_counter += 1
    actions = {
        "misfire":              "Reduce throttle; inspect ignition timing and spark plugs",
        "overheating":          "Reduce power; check coolant and oil levels",
        "sensor_drift":         "Cross-check sensor readings; schedule calibration",
        "cooling_degradation":  "Reduce throttle; inspect cooling fins and airflow",
        "lubrication_issue":    "Reduce power immediately; check oil pressure system",
        "injector_abnormality": "Reduce throttle; inspect fuel injectors",
        "abnormal_vibration":   "Reduce RPM; inspect propeller and mounts",
        "combustion_instability": "Adjust mixture; check ignition system",
        "none":                 "Monitor closely; no immediate action required",
    }
    return AlertMessage(
        alert_id=f"alrt-{_alert_counter:04d}",
        timestamp=tick["timestamp"],
        severity=tick["severity"],
        fault_class=ml.fault_class,
        message=f"{ml.fault_class.replace('_',' ').title()} detected — driven by {', '.join(ml.top_contributors)}",
        rul_hours=ml.rul_hours,
        recommended_action=actions.get(ml.fault_class, "Monitor system"),
    )


def process(packet: RawTelemetryPacket) -> tuple[dict, AlertMessage | None]:
    """
    Full per-tick pipeline.
    Returns (enriched_tick_dict, alert_or_None).
    """
    # Physics prediction
    predicted, extrapolated = _physics.predict(packet.operating_condition)

    # Residual computation — ML never bypasses this step
    sensors_dict = packet.sensors.model_dump()
    predicted_dict = predicted.model_dump()
    residual = _compute_residual(sensors_dict, predicted_dict)

    # ML inference
    ml_out = None
    try:
        ml_out = health_engine.predict(residual)
    except Exception as e:
        log.warning(f"ML inference failed (tick skipped): {e}")

    severity = _severity_from_score(ml_out.anomaly_score if ml_out else 0.0)
    health_index = ml_out.health_index if ml_out else 1.0

    tick_dict = {
        "timestamp": packet.timestamp,
        "mission_id": packet.mission_id,
        "sensors": sensors_dict,
        "predicted": predicted_dict,
        "residual": residual.model_dump(),
        "ml_output": ml_out.model_dump() if ml_out else None,
        "severity": severity,
        "health_index": health_index,
        "model_extrapolated": extrapolated,
        "injected_fault": packet.injected_fault,
    }

    # Persist
    try:
        database.upsert_mission(
            packet.mission_id,
            packet.timestamp,
            "live",
        )
        database.save_tick(tick_dict)
    except Exception as e:
        log.warning(f"DB write failed: {e}")

    alert = _build_alert(tick_dict, ml_out)
    return tick_dict, alert
