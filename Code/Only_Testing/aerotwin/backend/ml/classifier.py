"""
classifier.py — Gradient Boosted Tree fault classifier.
Input: ResidualVector only. Output: FaultClass + confidence.
"""
from __future__ import annotations
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from schemas import ResidualVector, FaultClass
import config

# Ordered fault class list (index → class label)
FAULT_CLASSES: list[str] = [
    "none", "misfire", "injector_abnormality", "cooling_degradation",
    "lubrication_issue", "sensor_drift", "combustion_instability",
    "overheating", "abnormal_vibration",
]


class FaultClassifier:
    def __init__(self):
        self._model: GradientBoostingClassifier | None = None
        self._anomaly_threshold = config.ANOMALY_THRESHOLD

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """Train on residual vectors with integer fault class labels."""
        self._model = GradientBoostingClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.1,
            random_state=42,
        )
        self._model.fit(X, y)

    def classify(
        self, residual: ResidualVector, anomaly_score: float
    ) -> tuple[str, float]:
        """
        Returns (fault_class, confidence).
        Returns ("none", 1.0) if anomaly_score is below threshold.
        """
        if self._model is None or anomaly_score < 0.5:
            return "none", 1.0 - anomaly_score

        arr = np.array(residual.as_array()).reshape(1, -1)
        proba = self._model.predict_proba(arr)[0]
        idx = int(np.argmax(proba))
        fault_class = FAULT_CLASSES[idx] if idx < len(FAULT_CLASSES) else "none"
        confidence = round(float(proba[idx]), 4)
        return fault_class, confidence
