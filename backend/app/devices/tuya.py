"""Tuya device integration - local LAN control via tinytuya, no cloud calls at runtime.

Each device's `device_id` and `local_key` come from a one-time lookup in Tuya's IoT
developer console (see CLAUDE.md); after that, every read/write here talks straight to the
device over the LAN. Devices are configured in the gitignored backend/tuya_devices.json -
copy tuya_devices.example.json to start.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Protocol

import tinytuya
from pydantic import BaseModel, TypeAdapter

from .models import Device, DeviceType
from .registry import DeviceRegistry

logger = logging.getLogger(__name__)

TUYA_DEVICES_FILE = Path(__file__).resolve().parents[2] / "tuya_devices.json"
POLL_SECONDS = 30
SOCKET_TIMEOUT_SECONDS = 5
# tinytuya's own socket timeout doesn't reliably fire for every kind of hang (observed one
# sitting well past it against a real flaky device) - this is a hard backstop above it, at
# the asyncio level, so one stuck device can never block polling for every device after it
# in the loop.
READ_TIMEOUT_SECONDS = 8


class RawRange(BaseModel):
    """A state key's native device range, for converting to/from Homie's own 0-100 scale."""

    min: int
    max: int


class TuyaDeviceConfig(BaseModel):
    """One physical Tuya device and how it maps onto Homie's device model.

    `dps` maps Homie's own state keys (is_on, brightness) to this device's Tuya data-point
    indices. These vary by product - DP "1" is a near-universal plug/switch convention, but
    a bulb's DPs (brightness, color, ...) depend on its specific product category. Don't trust
    the example file's numbers for a different device; check the real ones via tinytuya's own
    status/scan output (or the wizard's "Download DP Name mappings" step) once you have
    local_key and ip.
    """

    id: str
    name: str
    room: str
    type: DeviceType
    tuya_id: str
    local_key: str
    ip: str
    version: float = 3.3
    dps: dict[str, str]
    # Homie's own brightness scale is 1-100 (every light's slider assumes it - "off" is the
    # separate is_on toggle, not 0% brightness) - a device whose brightness DP uses a
    # different native range (10-1000 is common) needs that range here so TuyaDriver can
    # convert both ways. This also happens to be what the Tuya app itself displays, since a
    # device's minimum raw value is its own definition of "1%". Leave unset for a DP that's
    # already 1-100 (or, close enough, 0-100).
    brightness_range: RawRange | None = None
    # Color temperature (cold<->warm), Homie scale 0-100 - unlike brightness, 0 is a real
    # position here, not "off", so there's no floor to work around. Not every light has this
    # DP; leave both this and "color_temp" out of `dps` for one that doesn't. A "single_color"
    # category device (see `notes` below) will accept and report this DP without it doing
    # anything visible - the Tuya app shows the same generic slider regardless of whether the
    # fixture has the hardware to back it.
    color_temp_range: RawRange | None = None
    # Per-state-key caveats worth surfacing in the UI - see Device.notes in models.py.
    notes: dict[str, str] = {}


def load_tuya_devices(path: Path = TUYA_DEVICES_FILE) -> list[TuyaDeviceConfig]:
    if not path.exists():
        logger.warning(
            "%s not found - copy tuya_devices.example.json to enable Tuya devices", path.name
        )
        return []
    return TypeAdapter(list[TuyaDeviceConfig]).validate_json(path.read_text(encoding="utf-8"))


class TuyaUnreachableError(Exception):
    pass


class _StatusCall(Protocol):
    def __call__(self) -> dict[str, Any]: ...


class TuyaDriver:
    """Talks to one physical Tuya device over the LAN. tinytuya's socket calls are blocking,
    so every call here runs in a worker thread rather than the event loop."""

    def __init__(self, config: TuyaDeviceConfig) -> None:
        self._config = config
        self._device = tinytuya.Device(
            config.tuya_id, config.ip, config.local_key, version=config.version
        )
        self._device.set_socketTimeout(SOCKET_TIMEOUT_SECONDS)
        # tinytuya's connection isn't safe for overlapping requests - a client's write landing
        # at the same moment as the poller's periodic read (or two quick writes) can cross
        # wires on the same socket, which surfaces as the device going "unreachable" for no
        # real reason. One conversation with this device at a time.
        self._lock = asyncio.Lock()

    async def apply(self, partial_state: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            return await self._run_with_timeout(self._apply_sync, partial_state)

    async def read_state(self) -> dict[str, Any]:
        async with self._lock:
            return await self._run_with_timeout(self._read_sync)

    async def _run_with_timeout(self, fn: Any, *args: Any) -> dict[str, Any]:
        # tinytuya's own socket timeout doesn't reliably fire for every kind of hang
        # (observed one sitting well past it against a real flaky device) - this is a hard
        # backstop at the asyncio level, so one stuck device can never block the poller loop
        # for every device after it, or leave a client's PATCH request hanging forever.
        # Note: this only stops *awaiting* the worker thread, not the thread itself (Python
        # can't force-kill a blocked thread) - a very rare later collision with that zombie
        # thread is an accepted tradeoff against the much more likely and severe alternative.
        try:
            return await asyncio.wait_for(asyncio.to_thread(fn, *args), READ_TIMEOUT_SECONDS)
        except TimeoutError as exc:
            raise TuyaUnreachableError(f"timed out after {READ_TIMEOUT_SECONDS}s") from exc

    def _apply_sync(self, partial_state: dict[str, Any]) -> dict[str, Any]:
        dps = self._to_dps(partial_state)
        if dps:
            self._call(lambda: self._device.set_multiple_values(dps))
        return self._read_sync()

    def _read_sync(self) -> dict[str, Any]:
        status = self._call(self._device.status)
        return self._from_dps(status.get("dps", {}))

    # Homie floor per state key - brightness's is 1 (0% is the separate is_on toggle, not a
    # real brightness), color_temp's is 0 (there's no "off" concept for it, 0 is a real
    # position - coldest or warmest, matching whatever the device's own r.min represents).
    _HOMIE_FLOOR: dict[str, int] = {"brightness": 1, "color_temp": 0}

    def _to_dps(self, state: dict[str, Any]) -> dict[str, Any]:
        dps: dict[str, Any] = {}
        for key, value in state.items():
            if key not in self._config.dps:
                continue
            range_ = self._range_for(key)
            if range_ is not None:
                value = self._scale_to_device(value, range_, self._HOMIE_FLOOR[key])
            dps[self._config.dps[key]] = value
        return dps

    def _from_dps(self, dps: dict[str, Any]) -> dict[str, Any]:
        index_to_key = {index: key for key, index in self._config.dps.items()}
        state: dict[str, Any] = {}
        for index, value in dps.items():
            key = index_to_key.get(index)
            if key is None:
                continue
            range_ = self._range_for(key)
            if range_ is not None:
                value = self._scale_from_device(value, range_, self._HOMIE_FLOOR[key])
            state[key] = value
        return state

    def _range_for(self, key: str) -> RawRange | None:
        if key == "brightness":
            return self._config.brightness_range
        if key == "color_temp":
            return self._config.color_temp_range
        return None

    @staticmethod
    def _scale_to_device(homie_value: int, r: RawRange, floor: int) -> int:
        # Interpolating [floor,100] onto [r.min,r.max] (rather than [0,100]) is what makes
        # this match the Tuya app's own displayed percentage - see brightness_range's docstring.
        span = 100 - floor
        return round(r.min + (homie_value - floor) / span * (r.max - r.min))

    @staticmethod
    def _scale_from_device(device_value: int, r: RawRange, floor: int) -> int:
        span = 100 - floor
        return round(floor + (device_value - r.min) / (r.max - r.min) * span)

    @staticmethod
    def _call(call: _StatusCall) -> dict[str, Any]:
        # tinytuya raises on some failures (socket errors) and returns an {"Error": ...} dict
        # on others (device rejected the request) - normalize both into one exception type.
        try:
            result = call()
        except Exception as exc:
            raise TuyaUnreachableError(str(exc)) from exc
        if not isinstance(result, dict) or "Error" in result:
            raise TuyaUnreachableError(str(result))
        return result


def build_devices(configs: list[TuyaDeviceConfig]) -> tuple[list[Device], dict[str, TuyaDriver]]:
    """Homie Device entries (state filled in once the poller's first pass completes) plus each
    device's driver, to hand to registry.register_driver after seeding."""
    devices = [
        Device(
            id=c.id,
            name=c.name,
            room=c.room,
            type=c.type,
            # color_temp seeded as null (not just absent) when the config declares it, so the
            # frontend can tell "no color-temp DP on this fixture" (key missing) apart from
            # "has one, just hasn't been read yet" (key present, value unknown) - otherwise a
            # device that's never had a successful poll looks identical to one that simply
            # doesn't support color temperature at all.
            state={"color_temp": None} if "color_temp" in c.dps else {},
            notes=c.notes,
        )
        for c in configs
    ]
    drivers = {c.id: TuyaDriver(c) for c in configs}
    return devices, drivers


async def _poll_one(registry: DeviceRegistry, device_id: str, driver: TuyaDriver) -> None:
    try:
        state = await driver.read_state()
    except TuyaUnreachableError as exc:
        logger.warning("Tuya device %s unreachable: %s", device_id, exc)
        await registry.set_online(device_id, False)
        return
    await registry.set_full_state(device_id, state)


async def run_tuya_poller(registry: DeviceRegistry, drivers: dict[str, TuyaDriver]) -> None:
    """Reads each real device's status and pushes it into the registry - catches changes made
    outside Homie (the Tuya app, a physical switch) and, since it polls immediately before its
    first sleep, gives newly-seeded devices their real state right away instead of the blank
    one build_devices left them with.

    Devices are polled concurrently, not one at a time - each has its own driver, lock, and
    LAN connection, so there's nothing to serialize across different devices (only within one,
    which TuyaDriver's own lock already handles). Polling sequentially would mean one slow or
    unreachable device (up to READ_TIMEOUT_SECONDS) delays every device after it in the list -
    with enough devices, that risks a poll cycle taking longer than POLL_SECONDS itself."""
    while True:
        await asyncio.gather(
            *(_poll_one(registry, device_id, driver) for device_id, driver in drivers.items())
        )
        await asyncio.sleep(POLL_SECONDS)
