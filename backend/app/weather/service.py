from __future__ import annotations

import asyncio
import datetime as dt
import logging

import httpx

from .client import fetch_weather
from .models import Location, LocationWeather, WeatherResponse

logger = logging.getLogger(__name__)

REFRESH_INTERVAL_SECONDS = 15 * 60
RETRY_INTERVAL_SECONDS = 60


class WeatherService:
    """Holds the latest weather so every client reads from one shared cache."""

    def __init__(self, locations: list[Location]) -> None:
        self.locations = locations
        self._weather: list[LocationWeather] = []
        self._updated_at: dt.datetime | None = None

    def get(self) -> WeatherResponse:
        return WeatherResponse(updated_at=self._updated_at, locations=self._weather)

    async def refresh(self) -> bool:
        """Fetch fresh data; on failure keep serving the previous data. Returns success."""
        try:
            self._weather = await fetch_weather(self.locations)
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("Weather refresh failed: %s", exc)
            return False
        self._updated_at = dt.datetime.now(dt.UTC)
        return True


async def run_weather_refresher(service: WeatherService) -> None:
    while True:
        succeeded = await service.refresh()
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS if succeeded else RETRY_INTERVAL_SECONDS)
