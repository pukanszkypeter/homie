from __future__ import annotations

from typing import Any

import httpx

from .models import CurrentWeather, DailyForecast, Location, LocationWeather

API_URL = "https://api.open-meteo.com/v1/forecast"
CURRENT_FIELDS = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "weather_code",
    "wind_speed_10m",
    "is_day",
]
DAILY_FIELDS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
]
FORECAST_DAYS = 4


async def fetch_weather(locations: list[Location]) -> list[LocationWeather]:
    """Fetch current conditions and a short forecast for every location in one request."""
    params = {
        "latitude": ",".join(str(loc.latitude) for loc in locations),
        "longitude": ",".join(str(loc.longitude) for loc in locations),
        "current": ",".join(CURRENT_FIELDS),
        "daily": ",".join(DAILY_FIELDS),
        "timezone": "auto",
        "forecast_days": FORECAST_DAYS,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(API_URL, params=params)
        response.raise_for_status()

    payload = response.json()
    # Open-Meteo returns a bare object for one location and a list for several.
    results = payload if isinstance(payload, list) else [payload]
    return [_parse(location.name, item) for location, item in zip(locations, results, strict=True)]


def _parse(name: str, data: dict[str, Any]) -> LocationWeather:
    current = data["current"]
    daily = data["daily"]
    return LocationWeather(
        name=name,
        current=CurrentWeather(
            temperature=current["temperature_2m"],
            feels_like=current["apparent_temperature"],
            humidity=current["relative_humidity_2m"],
            wind_speed=current["wind_speed_10m"],
            weather_code=current["weather_code"],
            is_day=bool(current["is_day"]),
        ),
        daily=[
            DailyForecast(
                date=day,
                weather_code=code,
                temp_max=high,
                temp_min=low,
                precipitation_probability=rain,
            )
            for day, code, high, low, rain in zip(
                daily["time"],
                daily["weather_code"],
                daily["temperature_2m_max"],
                daily["temperature_2m_min"],
                daily["precipitation_probability_max"],
                strict=True,
            )
        ],
    )
