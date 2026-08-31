"""
rul.py — Remaining Useful Life estimator.

Uses exponential degradation trend fit on rolling anomaly score history.
Returns null / "insufficient_data" for the first MIN_RUL_HISTORY_TICKS ticks.
"""
from __future__ import annotations
import numpy as np
from schemas import RULStatus
import config

# Maximum RUL estimate (hours) — used as the healthy-state baseline
_MAX_RUL_HOURS = 500.0
_MIN_HISTORY = config.MIN_RUL_HISTORY_TICKS


class RULEstimator:
    def __init__(self):
        self._history: list[float] = []

    def update_and_estimate(self, anomaly_score: float) -> dict:
        """
        Add latest anomaly score and compute RUL.
        Returns {"rul_hours": float|None, "rul_status": RULStatus}
        """
        self._history.append(anomaly_score)

        # Cold-start guard (Fix 8)
        if len(self._history) < _MIN_HISTORY:
            return {"rul_hours": None, "rul_status": "insufficient_data"}

        # Rolling window (last 60 ticks = 12s at 5Hz)
        window = np.array(self._history[-60:])
        rul_hours = self._estimate(window)
        return {"rul_hours": round(rul_hours, 2), "rul_status": "ok"}

    def _estimate(self, window: np.ndarray) -> float:
        """
        Exponential degradation fit:
          degradation = 1 - exp(-k * mean_score * t)
        Inverted to give remaining hours.
        """
        mean_score = float(np.mean(window))
        slope = float(np.polyfit(np.arange(len(window)), window, 1)[0])

        if mean_score < 0.1:
            return _MAX_RUL_HOURS   # very healthy — max RUL

        # Decay constant from current degradation level
        k = max(0.001, mean_score * 0.15 + max(0.0, slope) * 5.0)
        rul = _MAX_RUL_HOURS * np.exp(-k * mean_score * 20)
        return float(np.clip(rul, 0.1, _MAX_RUL_HOURS))

    def get_degradation_trend(self) -> float:
        """
        Normalised slope of last-N anomaly scores [0=stable, 1=rapid decline].
        Used by health_engine.py for the health_index formula.
        """
        if len(self._history) < 5:
            return 0.0
        window = np.array(self._history[-30:])
        slope = float(np.polyfit(np.arange(len(window)), window, 1)[0])
        return float(np.clip(slope * 50.0, 0.0, 1.0))

    def reset(self) -> None:
        self._history.clear()
