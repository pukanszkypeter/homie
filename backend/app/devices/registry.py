from __future__ import annotations

import asyncio
from typing import Any, Protocol

from fastapi import WebSocket

from .models import WRITABLE_STATE_KEYS, Device


class UnknownDeviceError(KeyError):
    pass


class InvalidStateKeyError(ValueError):
    pass


class DeviceUnreachableError(Exception):
    pass


class DeviceDriver(Protocol):
    async def apply(self, partial_state: dict[str, Any]) -> dict[str, Any]:
        """Send a command to the real device and return the state it actually confirmed -
        never assume the request succeeded as asked."""
        ...


class DeviceRegistry:
    """In-memory store of device state, with pub/sub for live updates.

    This is the seam between the rest of the app and "real" devices: a mock device has no
    driver, so update_state writes its state directly; a real one (see devices/tuya.py) has
    one registered, so the write goes through the driver first and the registry stores
    whatever the hardware actually confirmed - the API layer and frontend don't need to know
    which kind they're talking to either way.
    """

    def __init__(self) -> None:
        self._devices: dict[str, Device] = {}
        self._drivers: dict[str, DeviceDriver] = {}
        self._subscribers: list[WebSocket] = []
        self._lock = asyncio.Lock()

    def seed(self, devices: list[Device]) -> None:
        self._devices = {d.id: d for d in devices}

    def register_driver(self, device_id: str, driver: DeviceDriver) -> None:
        """Route this device's client-requested writes through a real integration instead of
        storing them as-is. A driver's own state reports (a poller reading real hardware, same
        as the mock simulator) still go through set_full_state directly - this only applies to
        update_state, the client-facing write path."""
        self._drivers[device_id] = driver

    def get_all(self) -> list[Device]:
        return list(self._devices.values())

    def get(self, device_id: str) -> Device:
        try:
            return self._devices[device_id]
        except KeyError:
            raise UnknownDeviceError(device_id) from None

    async def update_state(self, device_id: str, partial_state: dict[str, Any]) -> Device:
        """Apply a client-requested partial update, validating allowed keys."""
        device = self.get(device_id)
        allowed = WRITABLE_STATE_KEYS[device.type]
        unknown_keys = set(partial_state) - allowed
        if unknown_keys:
            raise InvalidStateKeyError(
                f"{device.type} device does not support keys: {sorted(unknown_keys)}"
            )
        driver = self._drivers.get(device_id)
        if driver is not None:
            try:
                partial_state = await driver.apply(partial_state)
            except Exception as exc:
                await self.set_online(device_id, False)
                raise DeviceUnreachableError(f"{device_id}: {exc}") from exc
        return await self._apply_state(device_id, partial_state)

    async def set_full_state(self, device_id: str, partial_state: dict[str, Any]) -> Device:
        """Apply a state update from the simulator/integration side (no key restrictions) -
        also marks the device online, since a state report only happens when it answered."""
        return await self._apply_state(device_id, partial_state)

    async def set_online(self, device_id: str, online: bool) -> Device:
        """Flag reachability. Going offline also forces is_on false - the failure mode this
        matters for is the fixture's mains power being physically cut, not a brief wifi
        hiccup, and a device with no power can't be lit regardless of what its last reading
        said. The rest of `state` (brightness, color_temp) is left at its last-known values,
        just marked stale via `online`, since those aren't contradicted by being unreachable
        the way is_on is. A no-op (no broadcast) if already in that state, since a
        still-offline device would otherwise rebroadcast the same thing every poll cycle."""
        async with self._lock:
            device = self.get(device_id)
            if device.online == online:
                return device
            updates: dict[str, Any] = {"online": online}
            if not online and "is_on" in device.state:
                updates["state"] = {**device.state, "is_on": False}
            updated = device.model_copy(update=updates)
            self._devices[device_id] = updated
        await self._broadcast(updated)
        return updated

    async def _apply_state(self, device_id: str, partial_state: dict[str, Any]) -> Device:
        async with self._lock:
            device = self.get(device_id)
            updated = device.model_copy(
                update={"state": {**device.state, **partial_state}, "online": True}
            )
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
        stale: list[WebSocket] = []
        for ws in self._subscribers:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.unsubscribe(ws)
