from __future__ import annotations

from fastapi import APIRouter, Request

from ..weather.models import WeatherResponse

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("", response_model=WeatherResponse)
async def get_weather(request: Request) -> WeatherResponse:
    return request.app.state.weather.get()
