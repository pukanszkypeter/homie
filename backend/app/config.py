from __future__ import annotations

import datetime as dt
from pathlib import Path
from zoneinfo import ZoneInfo

import tzlocal
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
TOKEN_CACHE_FILE = BACKEND_DIR / ".msal_token_cache.json"
SMARTTHINGS_TOKEN_CACHE_FILE = BACKEND_DIR / ".smartthings_token_cache.json"


class Settings(BaseSettings):
    """Secrets and personal config, read from backend/.env (gitignored)."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Matches docker-compose.yml's defaults, so a fresh checkout works with no .env
    # entry once `docker compose up -d` is running. Override if the Postgres this
    # points at isn't the local dev one (e.g. the NAS later).
    database_url: str = "postgresql+psycopg://homie:homie@localhost:5432/homie"

    # OAuth client for the SmartThings cloud API - the LAN-only rule's deliberate exception
    # for Samsung gear (AC, TV, speaker). A Personal Access Token was used at first, but
    # those cap out at 24h with no way to extend (a Dec 2024 Samsung policy change), which
    # doesn't work for an unattended poller - this is an OAuth-In app instead (one-time
    # browser sign-in via `python -m app.devices.smartthings_login`, see backend/README.md),
    # refreshed automatically after that. Empty disables the integration.
    smartthings_client_id: str = ""
    smartthings_client_secret: str = ""

    ms_client_id: str = ""
    # Comma-separated names of the To Do lists to show. Empty means none: lists that
    # aren't named are never fetched, so private lists stay private.
    ms_todo_lists: str = ""

    # IANA name, e.g. "Europe/London". Decides which calendar day a due date falls on.
    # Empty means this machine's timezone (set it explicitly on a server that runs in UTC).
    timezone: str = ""

    # Delete completed tasks older than this many days from ALL lists, daily. 0 = off.
    ms_todo_cleanup_days: int = 0

    @property
    def tzinfo(self) -> dt.tzinfo:
        return ZoneInfo(self.timezone) if self.timezone else tzlocal.get_localzone()

    @property
    def todo_list_names(self) -> list[str]:
        return [name.strip() for name in self.ms_todo_lists.split(",") if name.strip()]
