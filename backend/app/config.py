from __future__ import annotations

import datetime as dt
from pathlib import Path
from zoneinfo import ZoneInfo

import tzlocal
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
TOKEN_CACHE_FILE = BACKEND_DIR / ".msal_token_cache.json"


class Settings(BaseSettings):
    """Secrets and personal config, read from backend/.env (gitignored)."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

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
