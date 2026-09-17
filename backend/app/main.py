from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.devices import router as devices_router
from .api.ws import router as ws_router
from .devices.mock import run_simulator, seed_devices
from .devices.registry import DeviceRegistry


@asynccontextmanager
async def lifespan(app: FastAPI):
    registry = DeviceRegistry()
    registry.seed(seed_devices())
    app.state.registry = registry

    simulator_task = asyncio.create_task(run_simulator(registry))
    yield
    simulator_task.cancel()


app = FastAPI(title="Homie API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
