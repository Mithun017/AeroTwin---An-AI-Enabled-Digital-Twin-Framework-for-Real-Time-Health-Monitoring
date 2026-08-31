"""
whatif.py — What-If forward simulation endpoint.

This module is a thin API wrapper.
ALL physics are in physics/engine_model.py — no second implementation here.
Results are NOT persisted to the missions DB — What-If runs are
ephemeral previews only. Never call db.save_mission() from this module.
"""
from __future__ import annotations
import numpy as np
from fastapi import APIRouter
from schemas import WhatIfRequest, WhatIfResponse, WhatIfTickPreview, OperatingCondition, PredictedValues
from physics.engine_model import PhysicsEngineModel

router = APIRouter(prefix="/simulate", tags=["whatif"])
_model = PhysicsEngineModel()

# Preset configurations
_PRESETS = {
    "high_altitude":   {"altitude_m": 5500, "ambient_temp_c": 5,  "throttle_base": 80},
    "endurance":       {"altitude_m": 2000, "ambient_temp_c": 18, "throttle_base": 55},
    "hot_weather":     {"altitude_m": 500,  "ambient_temp_c": 45, "throttle_base": 70},
    "rapid_throttle":  {"altitude_m": 1500, "ambient_temp_c": 22, "throttle_base": 50},
}


@router.post("/whatif", response_model=WhatIfResponse)
async def whatif(req: WhatIfRequest):
    """
    Pure-physics forward simulation — no sensor input, no ML, not persisted.
    Frontend must display 'Simulated Preview — Not Live Data' banner.
    """
    preset = _PRESETS.get(req.preset or "", {})
    alt    = req.altitude_m      or preset.get("altitude_m", 2000)
    temp   = req.ambient_temp_c  or preset.get("ambient_temp_c", 20)
    base_throttle = preset.get("throttle_base", 65)

    dt = 1.0  # 1-second steps
    n_steps = int(req.duration_s / dt)
    ticks = []

    for i in range(n_steps):
        t = i * dt
        # Throttle profile: custom or sinusoidal for rapid_throttle
        if req.throttle_profile and i < len(req.throttle_profile):
            thr = req.throttle_profile[i]
        elif req.preset == "rapid_throttle":
            thr = base_throttle + 30 * np.sin(2 * np.pi * t / 15)
            thr = float(np.clip(thr, 20, 100))
        else:
            thr = float(base_throttle)

        cond = OperatingCondition(
            throttle_pct=thr, altitude_m=alt, ambient_temp_c=temp
        )
        predicted, _ = _model.predict(cond)
        ticks.append(WhatIfTickPreview(t_s=t, predicted=predicted, operating_condition=cond))

    return WhatIfResponse(request=req, ticks=ticks)
