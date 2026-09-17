from __future__ import annotations

from typing import Any, Dict, Literal

from pydantic import BaseModel

DeviceType = Literal["light", "outlet", "sensor"]

# Which state keys a client is allowed to write per device type.
# Sensors have no writable keys - they are read-only, driven by the simulator.
WRITABLE_STATE_KEYS: Dict[DeviceType, set[str]] = {
    "light": {"is_on", "brightness"},
    "outlet": {"is_on"},
    "sensor": set(),
}


class Device(BaseModel):
    id: str
    name: str
    room: str
    type: DeviceType
    state: Dict[str, Any]


class DeviceUpdate(BaseModel):
    """Partial state update sent by a client, e.g. {"is_on": true}."""

    state: Dict[str, Any]
