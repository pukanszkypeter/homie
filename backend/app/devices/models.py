from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

DeviceType = Literal["light", "ac", "speaker"]

# Which state keys a client is allowed to write per device type.
WRITABLE_STATE_KEYS: dict[DeviceType, set[str]] = {
    "light": {"is_on", "brightness", "color_temp"},
    "ac": {
        "is_on",
        "mode",
        "fan_mode",
        "target_temp",
        "swing_mode",
        "optional_mode",
        "auto_clean",
    },
    # Input-source switching exists on the capability (samsungvd.audioInputSource) but only as
    # a "next source" cycle command, not a direct set - and that cycle command is a confirmed
    # no-op on this hardware (ACCEPTED, no state change across repeated live tests), so it's
    # left out entirely rather than built as a button that does nothing.
    "speaker": {"is_on", "volume", "is_muted"},
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
    # False when the last poll (or write attempt) couldn't reach the device - e.g. physically
    # powered off, or dropped off wifi. `state` is left at its last-known values rather than
    # cleared, so the UI can still show what it was, just flagged as stale.
    online: bool = True


class DeviceUpdate(BaseModel):
    """Partial state update sent by a client, e.g. {"is_on": true}."""

    state: dict[str, Any]
