from __future__ import annotations

import asyncio
from typing import Any, Dict, List

from fastapi import WebSocket

from .models import WRITABLE_STATE_KEYS, Device


class UnknownDeviceError(KeyError):
    pass


class InvalidStateKeyError(ValueError):
    pass


class DeviceRegistry:
    """In-memory store of device state, with pub/sub for live updates.

    This is the seam between the rest of the app and "real" devices: swapping
    the mock simulator for actual hardware/protocol integrations later means
    writing something else that calls `update_state`/`set_full_state` - the
    API layer and frontend don't need to change.
    """

    def __init__(self) -> None:
        self._devices: Dict[str, Device] = {}
        self._subscribers: List[WebSocket] = []
        self._lock = asyncio.Lock()

    def seed(self, devices: List[Device]) -> None:
        self._devices = {d.id: d for d in devices}

    def get_all(self) -> List[Device]:
        return list(self._devices.values())

    def get(self, device_id: str) -> Device:
        try:
            return self._devices[device_id]
        except KeyError:
            raise UnknownDeviceError(device_id) from None

    async def update_state(self, device_id: str, partial_state: Dict[str, Any]) -> Device:
        """Apply a client-requested partial update, validating allowed keys."""
        device = self.get(device_id)
        allowed = WRITABLE_STATE_KEYS[device.type]
        unknown_keys = set(partial_state) - allowed
        if unknown_keys:
            raise InvalidStateKeyError(
                f"{device.type} device does not support keys: {sorted(unknown_keys)}"
            )
        return await self._apply_state(device_id, partial_state)

    async def set_full_state(self, device_id: str, partial_state: Dict[str, Any]) -> Device:
        """Apply a state update from the simulator/integration side (no key restrictions)."""
        return await self._apply_state(device_id, partial_state)

    async def _apply_state(self, device_id: str, partial_state: Dict[str, Any]) -> Device:
        async with self._lock:
            device = self.get(device_id)
            updated = device.model_copy(update={"state": {**device.state, **partial_state}})
            self._devices[device_id] = updated
        await self._broadcast(updated)
        return updated

    async def subscribe(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._subscribers.append(websocket)

    def unsubscribe(self, websocket: WebSocket) -> None:
        if websocket in self._subscribers:
            self._subscribers.remove(websocket)

    async def _broadcast(self, device: Device) -> None:
        message = {"type": "device_update", "device": device.model_dump()}
        stale: List[WebSocket] = []
        for ws in self._subscribers:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.unsubscribe(ws)
