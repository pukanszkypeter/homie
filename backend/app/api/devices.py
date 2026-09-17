from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..devices.models import Device, DeviceUpdate
from ..devices.registry import InvalidStateKeyError, UnknownDeviceError

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("", response_model=list[Device])
async def list_devices(request: Request) -> list[Device]:
    return request.app.state.registry.get_all()


@router.get("/{device_id}", response_model=Device)
async def get_device(device_id: str, request: Request) -> Device:
    try:
        return request.app.state.registry.get(device_id)
    except UnknownDeviceError:
        raise HTTPException(status_code=404, detail=f"Unknown device: {device_id}")


@router.patch("/{device_id}", response_model=Device)
async def update_device(device_id: str, update: DeviceUpdate, request: Request) -> Device:
    registry = request.app.state.registry
    try:
        return await registry.update_state(device_id, update.state)
    except UnknownDeviceError:
        raise HTTPException(status_code=404, detail=f"Unknown device: {device_id}")
    except InvalidStateKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
