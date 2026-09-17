from __future__ import annotations

import asyncio
import random

from .models import Device
from .registry import DeviceRegistry


def seed_devices() -> list[Device]:
    return [
        Device(
            id="living-room-light",
            name="Living Room Light",
            room="Living Room",
            type="light",
            state={"is_on": True, "brightness": 70},
        ),
        Device(
            id="living-room-outlet",
            name="Living Room TV Outlet",
            room="Living Room",
            type="outlet",
            state={"is_on": True, "power_w": 82.0},
        ),
        Device(
            id="living-room-temp",
            name="Living Room Temperature",
            room="Living Room",
            type="sensor",
            state={"kind": "temperature", "value": 21.5, "unit": "°C"},
        ),
        Device(
            id="bedroom-light",
            name="Bedroom Light",
            room="Bedroom",
            type="light",
            state={"is_on": False, "brightness": 40},
        ),
        Device(
            id="bedroom-humidity",
            name="Bedroom Humidity",
            room="Bedroom",
            type="sensor",
            state={"kind": "humidity", "value": 45.0, "unit": "%"},
        ),
        Device(
            id="kitchen-outlet",
            name="Kitchen Coffee Machine",
            room="Kitchen",
            type="outlet",
            state={"is_on": False, "power_w": 0.0},
        ),
    ]


async def run_simulator(registry: DeviceRegistry) -> None:
    """Periodically jitters sensor readings and powered-outlet draw.

    Stands in for a real integration pushing state changes from hardware.
    """
    while True:
        await asyncio.sleep(4)
        for device in registry.get_all():
            if device.type == "sensor":
                delta = random.uniform(-0.4, 0.4)
                new_value = round(device.state["value"] + delta, 1)
                await registry.set_full_state(device.id, {"value": new_value})
            elif device.type == "outlet" and device.state.get("is_on"):
                jitter = random.uniform(-5, 5)
                new_power = max(0.0, round(device.state["power_w"] + jitter, 1))
                await registry.set_full_state(device.id, {"power_w": new_power})
