"""
schemas.py — Single source of truth for all AeroTwin data contracts.

Every FastAPI route, WebSocket broadcast, and ML module uses these types.
No magic strings for state values — use the Literal types defined below.

Maps directly to workflow.md §4 message schemas.
"""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Literal Enums — import these in every module that needs state strings.
# Never hardcode "misfire" or "ok" elsewhere.
# ---------------------------------------------------------------------------

FaultClass = Literal[
    "none",                    # healthy — no fault detected
    "misfire",
    "injector_abnormality",
    "cooling_degradation",
    "lubrication_issue",
    "sensor_drift",
    "combustion_instability",
    "overheating",
    "abnormal_vibration",
]

RULStatus = Literal["ok", "insufficient_data"]

Severity = Literal["normal", "low", "medium", "high", "critical"]

FaultMode = Literal["ramp", "instant"]

AppMode = Literal["live", "replay", "whatif"]


# ---------------------------------------------------------------------------
# §4.1  Raw Telemetry Packet — Simulator → Backend
# ---------------------------------------------------------------------------

class OperatingCondition(BaseModel):
    throttle_pct: float = Field(..., ge=0, le=100, description="Throttle percentage")
    altitude_m: float = Field(..., ge=0, description="Altitude in metres")
    ambient_temp_c: float = Field(..., description="Ambient temperature °C")


class SensorReading(BaseModel):
    """Section B parameters — field names are the contract. Do not rename."""
    rpm: float
    cht: float          # Cylinder Head Temperature °C
    egt: float          # Exhaust Gas Temperature °C
    oil_pressure: float # bar
    oil_temp: float     # °C
    fuel_flow: float    # L/hr
    vibration: float    # g RMS
    battery_voltage: float  # V
    injection_timing: float # degrees BTDC


class RawTelemetryPacket(BaseModel):
    """Emitted by the simulator at each tick."""
    timestamp: str
    mission_id: str
    operating_condition: OperatingCondition
    sensors: SensorReading
    injected_fault: Optional[FaultClass] = None


# ---------------------------------------------------------------------------
# §4.2  Enriched Tick — Backend → Frontend via WebSocket
# ---------------------------------------------------------------------------

class PredictedValues(BaseModel):
    """Output of PhysicsEngineModel.predict() — mirrors SensorReading fields."""
    rpm: float
    cht: float
    egt: float
    oil_pressure: float
    oil_temp: float
    fuel_flow: float
    vibration: float
    battery_voltage: float
    injection_timing: float


class ResidualVector(BaseModel):
    """Actual − Predicted per channel. ML NEVER bypasses this step."""
    rpm: float
    cht: float
    egt: float
    oil_pressure: float
    oil_temp: float
    fuel_flow: float
    vibration: float
    battery_voltage: float
    injection_timing: float

    def as_array(self) -> list[float]:
        """Ordered list for ML model input — order matches SENSOR_FIELDS."""
        return [
            self.rpm, self.cht, self.egt, self.oil_pressure, self.oil_temp,
            self.fuel_flow, self.vibration, self.battery_voltage, self.injection_timing,
        ]


# Canonical ordered field names — used by ML modules and XAI ranking.
SENSOR_FIELDS: list[str] = [
    "rpm", "cht", "egt", "oil_pressure", "oil_temp",
    "fuel_flow", "vibration", "battery_voltage", "injection_timing",
]


class MLOutput(BaseModel):
    """
    Output of health_engine.predict(). All fields are typed — no magic strings.
    health_index formula (documented in workflow.md §4.2):
        health_index = max(0.0, 1.0 - (0.6 * anomaly_score + 0.4 * degradation_trend))
    """
    anomaly_score: float = Field(..., ge=0.0, le=1.0)
    fault_class: FaultClass
    confidence: float = Field(..., ge=0.0, le=1.0)
    rul_hours: Optional[float] = None       # None = insufficient_data (cold-start)
    rul_status: RULStatus
    top_contributors: list[str]             # residual channel names, ranked
    health_index: float = Field(..., ge=0.0, le=1.0)


class EnrichedTick(BaseModel):
    """Full tick broadcast over WebSocket to all frontend clients."""
    model_config = {"protected_namespaces": ()}
    timestamp: str
    mission_id: str
    sensors: SensorReading
    predicted: PredictedValues
    residual: ResidualVector
    ml_output: Optional[MLOutput] = None    # None if ML inference failed/timed out
    severity: Severity
    health_index: float = Field(..., ge=0.0, le=1.0)
    model_extrapolated: bool = False        # True if physics model was clamped out-of-range


# ---------------------------------------------------------------------------
# §4.3  Alert Message — Backend → Frontend on severity ≥ medium
# ---------------------------------------------------------------------------

class AlertMessage(BaseModel):
    alert_id: str
    timestamp: str
    severity: Severity
    fault_class: FaultClass
    message: str
    rul_hours: Optional[float] = None
    recommended_action: str


# ---------------------------------------------------------------------------
# §4.4  Mission Summary — REST, for reports (live/replay missions only)
#        NOT used for What-If results — use WhatIfResponse for those.
# ---------------------------------------------------------------------------

class MissionSummary(BaseModel):
    mission_id: str
    start_time: str
    end_time: Optional[str] = None
    duration_min: Optional[float] = None
    avg_health_index: Optional[float] = None
    faults_detected: list[FaultClass] = []
    min_rul_hours: Optional[float] = None
    recommendation: str = ""


# ---------------------------------------------------------------------------
# What-If Simulation — ephemeral, NEVER written to missions DB
# ---------------------------------------------------------------------------

class WhatIfRequest(BaseModel):
    """
    Preset or custom environmental scenario for forward simulation.
    Results are previews only — not persisted (see api/whatif.py).
    """
    preset: Optional[Literal[
        "high_altitude", "endurance", "hot_weather", "rapid_throttle"
    ]] = None
    throttle_profile: Optional[list[float]] = None   # list of throttle_pct over time
    altitude_m: Optional[float] = None
    ambient_temp_c: Optional[float] = None
    duration_s: float = Field(default=60.0, ge=5, le=600)


class WhatIfTickPreview(BaseModel):
    """Single time-step in a What-If result."""
    t_s: float                      # time offset in seconds
    predicted: PredictedValues
    operating_condition: OperatingCondition


class WhatIfResponse(BaseModel):
    """
    Result of POST /simulate/whatif.
    Intentionally NOT a MissionSummary — these are ephemeral simulation previews.
    Frontend must display the 'Simulated Preview — Not Live Data' banner for this type.
    """
    request: WhatIfRequest
    ticks: list[WhatIfTickPreview]
    note: str = "Simulated Preview — Not Live Data"


# ---------------------------------------------------------------------------
# Control / API request bodies
# ---------------------------------------------------------------------------

class ScenarioControlRequest(BaseModel):
    """Body for POST /control/scenario."""
    scenario: str           # must match a key in simulator/scenarios.py SCENARIOS dict
    mode: FaultMode = "ramp"


class ReplayRequest(BaseModel):
    mission_id: str
    speed: float = Field(default=1.0, ge=0.5, le=8.0)
