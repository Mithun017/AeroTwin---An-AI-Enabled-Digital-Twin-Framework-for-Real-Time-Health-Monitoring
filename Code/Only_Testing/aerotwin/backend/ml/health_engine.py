"""
health_engine.py — ML Orchestrator

Calls: anomaly → classifier → RUL → XAI
Computes health_index with explicit documented formula.
All ML input/output types enforced via schemas.py Pydantic models.
"""
from __future__ import annotations
from schemas import ResidualVector, MLOutput
from ml.anomaly import AnomalyDetector
from ml.classifier import FaultClassifier
from ml.rul import RULEstimator
from ml import explainability


class HealthEngine:
    def __init__(self):
        self._anomaly: AnomalyDetector | None = None
        self._classifier: FaultClassifier | None = None
        self._rul: RULEstimator = RULEstimator()

    def init(self, models: dict) -> None:
        self._anomaly = models["anomaly"]
        self._classifier = models["classifier"]
        self._rul = RULEstimator()   # fresh history on every init

    def predict(self, residual: ResidualVector) -> MLOutput:
        """
        Full ML pipeline on a single residual vector.
        Guaranteed < 50ms at demo tick rate.
        """
        # 1. Anomaly score
        anomaly_score = self._anomaly.score(residual) if self._anomaly else 0.0

        # 2. Fault classification (only if anomalous)
        if self._classifier and anomaly_score >= 0.35:
            fault_class, confidence = self._classifier.classify(residual, anomaly_score)
        else:
            fault_class, confidence = "none", round(1.0 - anomaly_score, 4)

        # 3. RUL (returns null on cold-start)
        rul_result = self._rul.update_and_estimate(anomaly_score)

        # 4. Explainability
        top_contributors = explainability.rank_contributors(residual, top_n=3)

        # 5. health_index formula (documented in workflow.md §4.2)
        degradation_trend = self._rul.get_degradation_trend()
        if anomaly_score < 0.25:
            health_index = max(0.0, 1.0 - (0.15 * anomaly_score + 0.1 * degradation_trend))
        else:
            health_index = max(0.0, 1.0 - (0.65 * anomaly_score + 0.35 * degradation_trend))

        return MLOutput(
            anomaly_score=round(anomaly_score, 4),
            fault_class=fault_class,
            confidence=round(confidence, 4),
            rul_hours=rul_result["rul_hours"],
            rul_status=rul_result["rul_status"],
            top_contributors=top_contributors,
            health_index=round(health_index, 3),
        )

    def reset(self) -> None:
        self._rul.reset()


# Module-level singleton
_engine = HealthEngine()

def init(models: dict) -> None:
    _engine.init(models)

def predict(residual: ResidualVector) -> MLOutput:
    return _engine.predict(residual)

def reset() -> None:
    _engine.reset()
