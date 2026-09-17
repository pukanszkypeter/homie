from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws")
async def device_updates(websocket: WebSocket) -> None:
    registry = websocket.app.state.registry
    await registry.subscribe(websocket)
    try:
        while True:
            # Client doesn't need to send anything; just keep the connection open.
            await websocket.receive_text()
    except WebSocketDisconnect:
        registry.unsubscribe(websocket)
