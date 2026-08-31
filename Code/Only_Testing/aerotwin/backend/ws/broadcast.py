"""
broadcast.py — WebSocket connection manager.
Maintains all connected frontend clients and broadcasts enriched ticks.
"""
from __future__ import annotations
import json
import logging
from fastapi import WebSocket

log = logging.getLogger("aerotwin.ws")


class ConnectionManager:
    def __init__(self):
        self._clients: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.append(ws)
        log.info(f"WS client connected. Total: {len(self._clients)}")

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._clients:
            self._clients.remove(ws)
        log.info(f"WS client disconnected. Total: {len(self._clients)}")

    async def send_all(self, data: dict) -> None:
        """Broadcast dict as JSON to all connected clients."""
        dead = []
        payload = json.dumps(data, default=str)
        for ws in self._clients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)


# Module-level singleton
manager = ConnectionManager()

async def connect(ws: WebSocket) -> None:
    await manager.connect(ws)

def disconnect(ws: WebSocket) -> None:
    manager.disconnect(ws)

async def send_all(data: dict) -> None:
    await manager.send_all(data)
