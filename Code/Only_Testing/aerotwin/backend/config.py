"""
config.py — All tunables in one place.
Change values here; never hardcode them in business logic modules.
"""
import os

# --- Tick / streaming ---
TICK_RATE_HZ: float = 5.0          # ticks per second sent over WebSocket

# --- Server ---
WS_HOST: str = "0.0.0.0"
WS_PORT: int = 8000
FRONTEND_ORIGIN: str = "http://localhost:5173"

# --- Database ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH: str = os.path.join(BASE_DIR, "db", "aerotwin.db")

# --- ML cache ---
MODEL_CACHE_DIR: str = os.path.join(BASE_DIR, "ml", "model_cache")

# --- ML thresholds ---
# Tune on healthy training set: mean + 2×std of Isolation Forest scores.
# Exposed here so demo ops can adjust without touching ML code.
ANOMALY_THRESHOLD: float = 0.55

# --- RUL cold-start ---
# How many anomaly-score history ticks are needed before RUL is meaningful.
# At 5 Hz this is 4 seconds of data — safe minimum for trend fitting.
MIN_RUL_HISTORY_TICKS: int = 20

# --- Simulation defaults ---
DEFAULT_SCENARIO: str = "normal_flight"
DEFAULT_FAULT_MODE: str = "ramp"    # "ramp" | "instant"

# --- Replay ---
DEFAULT_REPLAY_SPEED: float = 1.0   # 0.5x – 8x
MAX_BACKFILL_TICKS: int = 50        # ticks fetched on WS reconnect
