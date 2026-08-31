"""
main.py — AeroTwin FastAPI application entrypoint (Phase 4 — Full Live Loop)
"""
from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from db import database
from ml import trainer, health_engine
from ws import broadcast, pipeline
from simulator import telemetry_generator
from api import routes
from api import whatif

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("aerotwin")

_live_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _live_task

    database.init_db()
    log.info("Database ready.")

    log.info("Loading ML models (cache-aware)…")
    models = trainer.load_or_train()
    health_engine.init(models)

    _live_task = asyncio.create_task(_live_loop(), name="live_loop")
    log.info(f"✓ AeroTwin live loop started at {config.TICK_RATE_HZ} Hz")
    log.info("  Backend: http://localhost:8000")
    log.info("  API docs: http://localhost:8000/docs")

    yield

    if _live_task and not _live_task.done():
        _live_task.cancel()
        try:
            await _live_task
        except asyncio.CancelledError:
            pass


async def _live_loop():
    interval = 1.0 / config.TICK_RATE_HZ
    while True:
        try:
            raw_packet = telemetry_generator.next_tick()
            tick_dict, alert = pipeline.process(raw_packet)

            # Broadcast enriched tick
            await broadcast.send_all({**tick_dict, "type": "tick"})

            # Broadcast alert if generated
            if alert:
                await broadcast.send_all({**alert.model_dump(), "type": "alert"})

        except Exception as exc:
            log.error(f"Live loop error (tick skipped): {exc}")
        await asyncio.sleep(interval)


app = FastAPI(
    title="AeroTwin API",
    description="AI-Enabled Digital Twin for Aero Piston Engine Health Monitoring — SIH 2026 PS-26054 (DRDO)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)
app.include_router(whatif.router)


@app.get("/health", tags=["meta"])
async def health_check():
    return {
        "status": "ok",
        "tick_rate_hz": config.TICK_RATE_HZ,
        "mission_id": telemetry_generator.get_mission_id(),
        "ws_clients": broadcast.manager.client_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.WS_HOST, port=config.WS_PORT, reload=False)
