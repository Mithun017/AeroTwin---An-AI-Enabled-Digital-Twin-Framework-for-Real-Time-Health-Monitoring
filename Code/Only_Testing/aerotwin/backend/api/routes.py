"""
routes.py — All FastAPI REST endpoints + WebSocket /ws/live.

All request/response bodies use schemas.py Pydantic models.
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from schemas import MissionSummary, ScenarioControlRequest
from db import database
from ws import broadcast, pipeline
from simulator import telemetry_generator
from simulator.scenarios import SCENARIOS

log = logging.getLogger("aerotwin.routes")
router = APIRouter()


# ---------------------------------------------------------------------------
# WebSocket — live enriched tick stream
# ---------------------------------------------------------------------------

@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await broadcast.connect(websocket)
    try:
        # Send last 50 ticks on connect (backfill for reconnect)
        mission_id = telemetry_generator.get_mission_id()
        ticks = database.get_ticks(mission_id, limit=50)
        for t in ticks:
            await websocket.send_json({**t, "type": "backfill"})

        # Keep connection alive — data is pushed by the live loop
        while True:
            await websocket.receive_text()   # ping-pong keepalive
    except WebSocketDisconnect:
        broadcast.disconnect(websocket)


# ---------------------------------------------------------------------------
# Missions
# ---------------------------------------------------------------------------

@router.get("/missions", tags=["missions"])
async def list_missions():
    return database.get_missions()


@router.get("/missions/{mission_id}/ticks", tags=["missions"])
async def get_mission_ticks(mission_id: str, limit: int = 2000):
    ticks = database.get_ticks(mission_id, limit=limit)
    if not ticks:
        raise HTTPException(404, f"Mission {mission_id} not found or has no ticks")
    return ticks


@router.get("/missions/{mission_id}/summary", tags=["missions"])
async def get_mission_summary(mission_id: str):
    mission = database.get_mission(mission_id)
    if not mission:
        raise HTTPException(404, f"Mission {mission_id} not found")
    stats = database.get_mission_summary_stats(mission_id)
    return {
        **mission,
        **stats,
        "recommendation": _build_recommendation(stats),
    }


def _build_recommendation(stats: dict) -> str:
    faults = stats.get("faults_detected", [])
    health = stats.get("avg_health_index", 1.0)
    if not faults or health > 0.85:
        return "No immediate maintenance required. Continue monitoring."
    if health < 0.5:
        return f"Critical: {', '.join(faults)} detected. Ground inspection required before next flight."
    return f"Advisory: {', '.join(faults)} detected. Schedule maintenance within next 10 flight hours."


# ---------------------------------------------------------------------------
# Scenario control
# ---------------------------------------------------------------------------

@router.post("/control/scenario", tags=["control"])
async def set_scenario(req: ScenarioControlRequest):
    if req.scenario not in SCENARIOS:
        raise HTTPException(400, f"Unknown scenario: {req.scenario}. Valid: {list(SCENARIOS.keys())}")
    telemetry_generator.set_scenario(req.scenario, req.mode)
    return {
        "status": "ok",
        "scenario": req.scenario,
        "mode": req.mode,
        "description": SCENARIOS[req.scenario].get("description", ""),
    }


@router.get("/scenarios", tags=["control"])
async def list_scenarios():
    return [
        {"name": k, "description": v.get("description", ""), "fault": v.get("fault")}
        for k, v in SCENARIOS.items()
    ]


# ---------------------------------------------------------------------------
# Current mission status
# ---------------------------------------------------------------------------

@router.get("/status", tags=["meta"])
async def status():
    return {
        "mission_id": telemetry_generator.get_mission_id(),
        "ws_clients": broadcast.manager.client_count,
    }
