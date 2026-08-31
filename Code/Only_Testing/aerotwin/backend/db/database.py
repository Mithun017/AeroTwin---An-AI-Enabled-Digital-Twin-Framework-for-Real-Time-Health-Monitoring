"""
database.py — SQLite persistence layer.

Tables:
  missions  — one row per mission (created on first tick, closed on stop)
  ticks     — one row per enriched tick; foreign key → missions

All inserts use Pydantic .model_dump() to stay in sync with schemas.py.
"""
from __future__ import annotations

import json
import sqlite3
import logging
from pathlib import Path

import config

log = logging.getLogger("aerotwin.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(config.SQLITE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # safe for concurrent reads
    return conn


def init_db() -> None:
    """Create tables if they don't exist. Safe to call on every startup."""
    Path(config.SQLITE_PATH).parent.mkdir(parents=True, exist_ok=True)
    with _get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS missions (
                mission_id    TEXT PRIMARY KEY,
                start_time    TEXT NOT NULL,
                end_time      TEXT,
                scenario      TEXT,
                closed        INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ticks (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id       TEXT NOT NULL,
                timestamp        TEXT NOT NULL,
                sensors_json     TEXT NOT NULL,
                predicted_json   TEXT NOT NULL,
                residual_json    TEXT NOT NULL,
                ml_output_json   TEXT,
                severity         TEXT NOT NULL,
                health_index     REAL NOT NULL,
                injected_fault   TEXT,
                FOREIGN KEY (mission_id) REFERENCES missions(mission_id)
            );

            CREATE INDEX IF NOT EXISTS idx_ticks_mission
                ON ticks(mission_id, timestamp);
        """)
    log.info(f"Database ready at {config.SQLITE_PATH}")


def upsert_mission(mission_id: str, start_time: str, scenario: str) -> None:
    with _get_conn() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO missions (mission_id, start_time, scenario)
               VALUES (?, ?, ?)""",
            (mission_id, start_time, scenario),
        )


def close_mission(mission_id: str, end_time: str) -> None:
    with _get_conn() as conn:
        conn.execute(
            "UPDATE missions SET end_time=?, closed=1 WHERE mission_id=?",
            (end_time, mission_id),
        )


def save_tick(tick: dict) -> None:
    """
    Persist one enriched tick. Accepts the dict form of EnrichedTick.
    Never call this from api/whatif.py — What-If results are NOT persisted.
    """
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO ticks
               (mission_id, timestamp, sensors_json, predicted_json,
                residual_json, ml_output_json, severity, health_index, injected_fault)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                tick["mission_id"],
                tick["timestamp"],
                json.dumps(tick["sensors"]),
                json.dumps(tick["predicted"]),
                json.dumps(tick["residual"]),
                json.dumps(tick.get("ml_output")),
                tick["severity"],
                tick["health_index"],
                tick.get("injected_fault"),
            ),
        )


def get_missions() -> list[dict]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM missions ORDER BY start_time DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_mission(mission_id: str) -> dict | None:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM missions WHERE mission_id=?", (mission_id,)
        ).fetchone()
    return dict(row) if row else None


def get_ticks(mission_id: str, limit: int = 5000) -> list[dict]:
    """Return ticks for a mission — used for replay and mission reports."""
    with _get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM ticks WHERE mission_id=?
               ORDER BY timestamp ASC LIMIT ?""",
            (mission_id, limit),
        ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        # Parse JSON blobs back into dicts
        d["sensors"] = json.loads(d["sensors_json"])
        d["predicted"] = json.loads(d["predicted_json"])
        d["residual"] = json.loads(d["residual_json"])
        d["ml_output"] = json.loads(d["ml_output_json"]) if d["ml_output_json"] else None
        result.append(d)
    return result


def get_mission_summary_stats(mission_id: str) -> dict:
    """Aggregate stats for MissionSummary REST response."""
    with _get_conn() as conn:
        row = conn.execute(
            """SELECT
                COUNT(*)            AS tick_count,
                AVG(health_index)   AS avg_health_index,
                MIN(health_index)   AS min_health_index,
                GROUP_CONCAT(DISTINCT injected_fault) AS faults_raw
               FROM ticks WHERE mission_id=?""",
            (mission_id,),
        ).fetchone()
    if not row:
        return {}
    faults = [f for f in (row["faults_raw"] or "").split(",") if f and f != "None"]
    return {
        "tick_count": row["tick_count"],
        "avg_health_index": round(row["avg_health_index"] or 0.0, 3),
        "min_health_index": round(row["min_health_index"] or 0.0, 3),
        "faults_detected": faults,
    }
