"""SmartThings device integration - cloud API control for Samsung gear (AC, TV, speaker) that
has no usable local protocol, the deliberate LAN-only exception noted in CLAUDE.md (the other
two need SmartThings' cloud regardless, so a second Samsung-specific local protocol for the TV
wouldn't avoid a cloud dependency, just duplicate one). Devices are configured in the gitignored
backend/smartthings_devices.json - copy smartthings_devices.example.json to start. Unlike Tuya's
raw socket calls, this is real async HTTP (httpx), so there's no blocking call to shuttle onto a
worker thread.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

import httpx
from pydantic import BaseModel, TypeAdapter

from .models import Device, DeviceType
from .registry import DeviceRegistry
from .smartthings_auth import SmartThingsTokenProvider

logger = logging.getLogger(__name__)

SMARTTHINGS_DEVICES_FILE = Path(__file__).resolve().parents[2] / "smartthings_devices.json"
SMARTTHINGS_API = "https://api.smartthings.com/v1"
POLL_SECONDS = 30
REQUEST_TIMEOUT_SECONDS = 10
# After writing, re-read up to this many extra times (READ_AFTER_WRITE_RETRY_SECONDS apart) if
# the change hasn't shown up yet - see _read_until_confirmed. 4 retries * 1.5s = 6s worst case
# added to a write, well under POLL_SECONDS so it still beats waiting for the next poll.
READ_AFTER_WRITE_RETRIES = 4
READ_AFTER_WRITE_RETRY_SECONDS = 1.5


class SmartThingsDeviceConfig(BaseModel):
    id: str
    name: str
    room: str
    type: DeviceType
    # SmartThings' own device id (a UUID) - find it via GET /v1/devices.
    smartthings_id: str


def load_smartthings_devices(path: Path = SMARTTHINGS_DEVICES_FILE) -> list[SmartThingsDeviceConfig]:
    if not path.exists():
        logger.warning(
            "%s not found - copy smartthings_devices.example.json to enable SmartThings devices",
            path.name,
        )
        return []
    return TypeAdapter(list[SmartThingsDeviceConfig]).validate_json(
        path.read_text(encoding="utf-8")
    )


class SmartThingsUnreachableError(Exception):
    pass


class SmartThingsDriver:
    """Talks to one Samsung device via the SmartThings cloud API. Handles `type: "ac"` and
    `type: "speaker"` - a TV config would need its own command/status mapping below too, since
    none of the three device types share a capability shape."""

    def __init__(
        self,
        config: SmartThingsDeviceConfig,
        http: httpx.AsyncClient,
        tokens: SmartThingsTokenProvider,
    ) -> None:
        self._config = config
        self._http = http
        self._tokens = tokens
        # Mirrors TuyaDriver's lock: keeps a write and the read-back that follows it from
        # interleaving with a concurrent poll of the same device.
        self._lock = asyncio.Lock()

    async def apply(self, partial_state: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            commands = self._to_commands(partial_state)
            if commands:
                await self._request(
                    "POST",
                    f"/devices/{self._config.smartthings_id}/commands",
                    json={"commands": commands},
                )
            return await self._read_until_confirmed(partial_state)

    async def _read_until_confirmed(self, requested: dict[str, Any]) -> dict[str, Any]:
        # SmartThings accepts a command immediately but its own /status endpoint can lag behind
        # the real device by several seconds (observed directly: a mode change took >9s to show
        # up) - reading back right away, once, would hand the client its own stale pre-change
        # state, which then only looks right once the next 30s poll happens to land after the
        # real device caught up. A short bounded retry here closes most of that gap without
        # blocking a write indefinitely - the regular poller is still the backstop for whatever's
        # left once this gives up.
        state = await self._read_locked()
        for _ in range(READ_AFTER_WRITE_RETRIES):
            if all(state.get(key) == value for key, value in requested.items()):
                break
            await asyncio.sleep(READ_AFTER_WRITE_RETRY_SECONDS)
            state = await self._read_locked()
        return state

    async def read_state(self) -> dict[str, Any]:
        async with self._lock:
            return await self._read_locked()

    async def _read_locked(self) -> dict[str, Any]:
        status = await self._request("GET", f"/devices/{self._config.smartthings_id}/status")
        main = status["components"]["main"]
        if self._config.type == "speaker":
            return self._speaker_from_status(main)
        return self._ac_from_status(main)

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        token = await self._tokens.get_token()
        if token is None:
            raise SmartThingsUnreachableError(
                "Not signed in - run `python -m app.devices.smartthings_login`"
            )
        try:
            response = await self._http.request(
                method,
                f"{SMARTTHINGS_API}{path}",
                timeout=REQUEST_TIMEOUT_SECONDS,
                headers={"Authorization": f"Bearer {token}"},
                **kwargs,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise SmartThingsUnreachableError(str(exc)) from exc
        return response.json() if response.content else {}

    def _to_commands(self, state: dict[str, Any]) -> list[dict[str, Any]]:
        if self._config.type == "speaker":
            return self._speaker_to_commands(state)
        return self._ac_to_commands(state)

    @staticmethod
    def _speaker_to_commands(state: dict[str, Any]) -> list[dict[str, Any]]:
        commands = []
        if "is_on" in state:
            commands.append(
                {"component": "main", "capability": "switch", "command": "on" if state["is_on"] else "off"}
            )
        if "volume" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "audioVolume",
                    "command": "setVolume",
                    "arguments": [state["volume"]],
                }
            )
        if "is_muted" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "audioMute",
                    "command": "mute" if state["is_muted"] else "unmute",
                }
            )
        return commands

    @staticmethod
    def _ac_to_commands(state: dict[str, Any]) -> list[dict[str, Any]]:
        commands = []
        if "is_on" in state:
            commands.append(
                {"component": "main", "capability": "switch", "command": "on" if state["is_on"] else "off"}
            )
        if "mode" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "airConditionerMode",
                    "command": "setAirConditionerMode",
                    "arguments": [state["mode"]],
                }
            )
        if "fan_mode" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "airConditionerFanMode",
                    "command": "setFanMode",
                    "arguments": [state["fan_mode"]],
                }
            )
        if "target_temp" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "thermostatCoolingSetpoint",
                    "command": "setCoolingSetpoint",
                    "arguments": [state["target_temp"]],
                }
            )
        if "swing_mode" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "fanOscillationMode",
                    "command": "setFanOscillationMode",
                    "arguments": [state["swing_mode"]],
                }
            )
        if "optional_mode" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "custom.airConditionerOptionalMode",
                    "command": "setAcOptionalMode",
                    "arguments": [state["optional_mode"]],
                }
            )
        if "auto_clean" in state:
            commands.append(
                {
                    "component": "main",
                    "capability": "custom.autoCleaningMode",
                    "command": "setAutoCleaningMode",
                    "arguments": ["on" if state["auto_clean"] else "off"],
                }
            )
        return commands

    @staticmethod
    def _speaker_from_status(main: dict[str, Any]) -> dict[str, Any]:
        def value(capability: str, attribute: str) -> Any:
            return main.get(capability, {}).get(attribute, {}).get("value")

        return {
            "is_on": value("switch", "switch") == "on",
            "volume": value("audioVolume", "volume"),
            "is_muted": value("audioMute", "mute") == "muted",
        }

    @staticmethod
    def _ac_from_status(main: dict[str, Any]) -> dict[str, Any]:
        def value(capability: str, attribute: str) -> Any:
            return main.get(capability, {}).get(attribute, {}).get("value")

        # Nested one level deeper than the other attributes (the "value" here is itself a
        # reading object, not a scalar), so it's pulled out separately from value() above.
        power_consumption = value("powerConsumptionReport", "powerConsumption") or {}

        return {
            "is_on": value("switch", "switch") == "on",
            "mode": value("airConditionerMode", "airConditionerMode"),
            "fan_mode": value("airConditionerFanMode", "fanMode"),
            "target_temp": value("thermostatCoolingSetpoint", "coolingSetpoint"),
            "current_temp": value("temperatureMeasurement", "temperature"),
            "swing_mode": value("fanOscillationMode", "fanOscillationMode"),
            "optional_mode": value("custom.airConditionerOptionalMode", "acOptionalMode"),
            "auto_clean": value("custom.autoCleaningMode", "autoCleaningMode") == "on",
            # Only meaningful while a clean cycle is actually running ("ready" the rest of the
            # time) - the frontend only shows progress when state isn't "ready".
            "auto_clean_state": value("custom.autoCleaningMode", "operatingState"),
            "auto_clean_progress": value("custom.autoCleaningMode", "progress"),
            # Read-only - not every unit reports this (Tuya-style "declared but not real"
            # capabilities exist here too), so None just means no filter-wear data available.
            "filter_status": value("custom.dustFilter", "dustFilterStatus"),
            "filter_usage": value("custom.dustFilter", "dustFilterUsage"),
            # Cumulative lifetime Wh, straight off the unit's own meter.
            "energy_wh": power_consumption.get("energy"),
            # The set of modes/speeds/etc this particular unit actually supports - read from
            # the device rather than assumed, since it's real capability data, not a UI note.
            "available_modes": value("airConditionerMode", "supportedAcModes"),
            "available_fan_modes": value("airConditionerFanMode", "supportedAcFanModes"),
            "available_swing_modes": value("fanOscillationMode", "supportedFanOscillationModes"),
            "available_optional_modes": value(
                "custom.airConditionerOptionalMode", "supportedAcOptionalMode"
            ),
        }


def build_devices(
    configs: list[SmartThingsDeviceConfig], tokens: SmartThingsTokenProvider
) -> tuple[list[Device], dict[str, SmartThingsDriver], httpx.AsyncClient]:
    """Homie Device entries (state filled in once the poller's first pass completes) plus each
    device's driver, to hand to registry.register_driver after seeding. Callers own the returned
    http client's lifecycle (aclose it on shutdown). No fixed Authorization header here - the
    access token can rotate (see SmartThingsTokenProvider), so each driver fetches a current one
    per-request instead."""
    http = httpx.AsyncClient()
    devices = [
        Device(id=c.id, name=c.name, room=c.room, type=c.type, state={})
        for c in configs
    ]
    drivers = {c.id: SmartThingsDriver(c, http, tokens) for c in configs}
    return devices, drivers, http


async def _poll_one(registry: DeviceRegistry, device_id: str, driver: SmartThingsDriver) -> None:
    try:
        state = await driver.read_state()
    except SmartThingsUnreachableError as exc:
        logger.warning("SmartThings device %s unreachable: %s", device_id, exc)
        await registry.set_online(device_id, False)
        return
    await registry.set_full_state(device_id, state)


async def run_smartthings_poller(
    registry: DeviceRegistry, drivers: dict[str, SmartThingsDriver]
) -> None:
    """Same shape as run_tuya_poller: polls every device concurrently (nothing to serialize
    across different cloud devices) and immediately on startup so newly-seeded devices get real
    state right away instead of the blank one build_devices left them with."""
    while True:
        await asyncio.gather(
            *(_poll_one(registry, device_id, driver) for device_id, driver in drivers.items())
        )
        await asyncio.sleep(POLL_SECONDS)
