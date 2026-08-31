"""
trainer.py — Cache-aware ML trainer with hash-based invalidation.

Startup behaviour:
  1. Compute config hash from PHYSICS_CONSTANTS + SCENARIOS dicts
  2. If cache exists AND hash matches → load instantly (<1s)
  3. If cache missing OR hash differs → retrain fresh (~30-60s), save cache
  --retrain flag → delete cache, force fresh training

Hash target: specific physics constants + scenario fault definitions.
Hashes config dicts, NOT full source code — immune to reformatting/comment changes.
"""
from __future__ import annotations
import os
import sys
import json
import hashlib
import logging
import numpy as np
import joblib
from pathlib import Path

from physics.engine_model import PhysicsEngineModel, PHYSICS_CONSTANTS
from simulator.scenarios import SCENARIOS
from ml.anomaly import AnomalyDetector
from ml.classifier import FaultClassifier, FAULT_CLASSES
import config

log = logging.getLogger("aerotwin.trainer")

_CACHE_DIR = Path(config.MODEL_CACHE_DIR)
_HASH_FILE = _CACHE_DIR / "config_hash.txt"
_ANOMALY_FILE = _CACHE_DIR / "anomaly_detector.pkl"
_CLASSIFIER_FILE = _CACHE_DIR / "fault_classifier.pkl"

# Training data size
_N_HEALTHY = 3000
_N_PER_FAULT = 400


# ---------------------------------------------------------------------------
# Hash computation (Fix 10 + 13a: hash dicts, not source text)
# ---------------------------------------------------------------------------

def _config_hash() -> str:
    """SHA-256 of PHYSICS_CONSTANTS + SCENARIOS dicts (json-serialisable subset)."""
    hashable_scenarios = {
        k: {kk: vv for kk, vv in v.items() if isinstance(vv, (str, int, float, list, type(None)))}
        for k, v in SCENARIOS.items()
    }
    payload = json.dumps(
        {"physics": PHYSICS_CONSTANTS, "scenarios": hashable_scenarios},
        sort_keys=True
    )
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def _cache_valid() -> bool:
    if not (_HASH_FILE.exists() and _ANOMALY_FILE.exists() and _CLASSIFIER_FILE.exists()):
        return False
    stored = _HASH_FILE.read_text().strip()
    current = _config_hash()
    return stored == current


# ---------------------------------------------------------------------------
# Synthetic training data generation
# ---------------------------------------------------------------------------

def _generate_training_data() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Returns:
      healthy_residuals  : (N_HEALTHY, 9) — near-zero, for anomaly detector
      X_classified       : (N_total, 9)   — for fault classifier
      y_classified       : (N_total,)     — integer class labels
    """
    model = PhysicsEngineModel()
    rng = np.random.default_rng(42)

    # ── Healthy residuals ──────────────────────────────────────────────
    healthy_residuals = rng.normal(0, 0.3, (_N_HEALTHY, 9))
    # Match telemetry generator noise scale
    sigma = np.array([4.0, 0.3, 0.8, 0.015, 0.2, 0.03, 0.003, 0.02, 0.03])
    healthy_residuals *= sigma

    # ── Fault-labelled dataset ─────────────────────────────────────────
    Xs, ys = [], []

    # Class 0: healthy
    Xs.append(healthy_residuals[:_N_PER_FAULT])
    ys.extend([0] * _N_PER_FAULT)

    # Classes 1–8: faults
    fault_scenarios = {
        k: v for k, v in SCENARIOS.items() if v.get("fault") is not None
    }
    for class_idx, (name, scenario) in enumerate(fault_scenarios.items(), start=1):
        offsets = scenario.get("offsets", {})
        field_order = ["rpm", "cht", "egt", "oil_pressure", "oil_temp",
                       "fuel_flow", "vibration", "battery_voltage", "injection_timing"]
        offset_arr = np.array([offsets.get(f, 0.0) for f in field_order])

        # Severity levels from 0.3 to 1.0 (random per sample)
        severities = rng.uniform(0.3, 1.0, (_N_PER_FAULT, 1))
        noise = rng.normal(0, 1.0, (_N_PER_FAULT, 9)) * sigma
        fault_residuals = noise + offset_arr * severities
        Xs.append(fault_residuals)
        ys.extend([class_idx] * _N_PER_FAULT)

    X_classified = np.vstack(Xs)
    y_classified = np.array(ys)
    return healthy_residuals, X_classified, y_classified


# ---------------------------------------------------------------------------
# Train
# ---------------------------------------------------------------------------

def _train_fresh() -> dict:
    log.info("Generating synthetic training data…")
    healthy, X, y = _generate_training_data()

    log.info(f"Training anomaly detector on {len(healthy)} healthy samples…")
    anomaly = AnomalyDetector()
    anomaly.fit(healthy)

    log.info(f"Training fault classifier on {len(X)} samples ({len(np.unique(y))} classes)…")
    classifier = FaultClassifier()
    classifier.fit(X, y)

    return {"anomaly": anomaly, "classifier": classifier}


def _save_cache(models: dict) -> None:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(models["anomaly"],    _ANOMALY_FILE)
    joblib.dump(models["classifier"], _CLASSIFIER_FILE)
    _HASH_FILE.write_text(_config_hash())
    log.info(f"ML models cached to {_CACHE_DIR}")


def _load_cache() -> dict:
    return {
        "anomaly":    joblib.load(_ANOMALY_FILE),
        "classifier": joblib.load(_CLASSIFIER_FILE),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_or_train() -> dict:
    """
    Cache-aware model loader.
    Startup log clearly states which path was taken.
    """
    # --retrain flag support
    if "--retrain" in sys.argv:
        log.info("--retrain flag detected — deleting cache and retraining…")
        for f in [_ANOMALY_FILE, _CLASSIFIER_FILE, _HASH_FILE]:
            if f.exists():
                f.unlink()

    if _cache_valid():
        log.info("ML loaded from cache (hash match) — startup instant ✓")
        return _load_cache()

    if _HASH_FILE.exists():
        log.info("ML cache stale (physics/scenario changed) — retraining…")
    else:
        log.info("ML training (first run) — this takes ~30-60s…")

    models = _train_fresh()
    _save_cache(models)
    log.info("ML training complete and cached.")
    return models
