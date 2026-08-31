"""
anomaly.py — Isolation Forest anomaly detector.
Operates exclusively on ResidualVector — never on raw sensor values.
"""
from __future__ import annotations
import numpy as np
from sklearn.ensemble import IsolationForest
from schemas import ResidualVector
import config


class AnomalyDetector:
    def __init__(self):
        self._model: IsolationForest | None = None
        self._mean_raw: float = 0.45
        self._scale_raw: float = 0.15

    def fit(self, healthy_residuals: np.ndarray) -> None:
        """Train on healthy-state residual vectors."""
        self._model = IsolationForest(
            n_estimators=150,
            contamination=0.03,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(healthy_residuals)
        # Calibrate baseline mean and scale on healthy distribution
        raw_scores = -self._model.score_samples(healthy_residuals)
        self._mean_raw = float(np.mean(raw_scores))
        p99 = float(np.percentile(raw_scores, 99))
        self._scale_raw = max(0.05, p99 - self._mean_raw)

    def score(self, residual: ResidualVector) -> float:
        """
        Returns anomaly score in [0, 1].
        0.0 = nominal healthy, 1.0 = highly anomalous.
        """
        if self._model is None:
            return 0.0
        arr = np.array(residual.as_array()).reshape(1, -1)
        raw = float(-self._model.score_samples(arr)[0])

        # If raw is within normal healthy variation, score is near zero
        if raw <= self._mean_raw:
            normalised = max(0.0, (raw - (self._mean_raw - self._scale_raw)) / (2.0 * self._scale_raw)) * 0.1
        else:
            normalised = 0.1 + ((raw - self._mean_raw) / (2.5 * self._scale_raw)) * 0.9

        return round(float(np.clip(normalised, 0.0, 1.0)), 4)

    def is_anomalous(self, score: float) -> bool:
        return score > 0.4
