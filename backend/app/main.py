from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.costs import router as costs_router
from .api.devices import router as devices_router
from .api.todos import router as todos_router
from .api.weather import router as weather_router
from .api.ws import router as ws_router
from .config import TOKEN_CACHE_FILE, Settings
from .costs.db import create_db_engine, migrate, session_factory
from .devices.registry import DeviceRegistry
from .devices.tuya import build_devices, load_tuya_devices, run_tuya_poller
from .todos.auth import TokenProvider
from .todos.cleanup import run_todo_cleanup
from .todos.client import GraphTodoClient
from .todos.service import TodoService, run_todo_refresher
from .weather.locations import load_locations
from .weather.service import WeatherService, run_weather_refresher

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()

    engine = create_db_engine()
    migrate(engine)
    app.state.db_sessions = session_factory(engine)

    registry = DeviceRegistry()
    tuya_configs = load_tuya_devices()
    tuya_devices, tuya_drivers = build_devices(tuya_configs)
    registry.seed(tuya_devices)
    for device_id, driver in tuya_drivers.items():
        registry.register_driver(device_id, driver)
    app.state.registry = registry

    weather = WeatherService(load_locations())
    app.state.weather = weather

    todo_client = (
        GraphTodoClient(
            TokenProvider(settings.ms_client_id, TOKEN_CACHE_FILE),
            settings.todo_list_names,
            settings.tzinfo,
        )
        if settings.ms_client_id
        else None
    )
    todos = TodoService(todo_client)
    app.state.todos = todos

    tasks = []
    if tuya_drivers:
        tasks.append(asyncio.create_task(run_tuya_poller(registry, tuya_drivers)))
    if weather.locations:
        tasks.append(asyncio.create_task(run_weather_refresher(weather)))
    if todo_client:
        tasks.append(asyncio.create_task(run_todo_refresher(todos)))
        if settings.ms_todo_cleanup_days > 0:
            tasks.append(
                asyncio.create_task(run_todo_cleanup(todo_client, settings.ms_todo_cleanup_days))
            )
    yield
    for task in tasks:
        task.cancel()
    if todo_client:
        await todo_client.aclose()
    engine.dispose()


app = FastAPI(title="Homie API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(costs_router)
app.include_router(devices_router)
app.include_router(todos_router)
app.include_router(weather_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
