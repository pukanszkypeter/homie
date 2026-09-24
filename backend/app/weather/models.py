from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, Field


class Location(BaseModel):
    name: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class CurrentWeather(BaseModel):
    temperature: float
    feels_like: float
    humidity: float
    wind_speed: float
    weather_code: int
    is_day: bool


class DailyForecast(BaseModel):
    date: dt.date
    weather_code: int
    temp_max: float
    temp_min: float
    precipitation_probability: float | None


class LocationWeather(BaseModel):
    """Weather for one place. Coordinates are deliberately not exposed to clients."""

    name: str
    current: CurrentWeather
    daily: list[DailyForecast]


class WeatherResponse(BaseModel):
    updated_at: dt.datetime | None
    locations: list[LocationWeather]
