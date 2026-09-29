from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

DeviceType = Literal["light"]

# Which state keys a client is allowed to write per device type.
WRITABLE_STATE_KEYS: dict[DeviceType, set[str]] = {
    "light": {"is_on", "brightness", "color_temp"},
}


class Device(BaseModel):
    id: str
    name: str
    room: str
    type: DeviceType
    state: dict[str, Any]
    # Per-state-key caveats worth surfacing in the UI (e.g. a control that's real and
    # writable but has no physical effect on this particular fixture) - keyed the same as
    # `state`, empty when there's nothing to say.
    notes: dict[str, str] = {}


class DeviceUpdate(BaseModel):
    """Partial state update sent by a client, e.g. {"is_on": true}."""

    state: dict[str, Any]
