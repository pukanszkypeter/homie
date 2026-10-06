"""OAuth for the SmartThings cloud API.

A SmartThings Personal Access Token is capped at 24 hours with no way to extend it (a
Samsung policy change from Dec 2024), which doesn't work for a poller that's supposed to run
unattended - so this uses an OAuth-In app instead: a one-time browser sign-in (see
smartthings_login.py) gets a refresh token, which this then exchanges for a fresh access
token automatically, keeping itself signed in indefinitely as long as it refreshes at least
every 29 days (trivial - the poller refreshes every 24h as access tokens expire). Mirrors
todos/auth.py's shape (a token cache file, a get_token() that refreshes lazily), but talks
to SmartThings' OAuth endpoints directly via httpx rather than MSAL.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

AUTHORIZE_URL = "https://api.smartthings.com/oauth/authorize"
TOKEN_URL = "https://api.smartthings.com/oauth/token"
SCOPES = "r:devices:* x:devices:* r:locations:*"
# Refresh this long before the access token's real expiry (SmartThings access tokens last
# 24h) so a request never races a token that's about to die mid-flight.
EXPIRY_SAFETY_MARGIN_SECONDS = 300


class SmartThingsTokenProvider:
    """Hands out SmartThings access tokens from a token cache kept in a file, refreshing via
    the refresh token as needed. The file holds a refresh token, so it's a secret: gitignored
    and written owner-only, same as todos/auth.py's MSAL cache."""

    def __init__(self, client_id: str, client_secret: str, cache_file: Path) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._cache_file = cache_file
        self._http = httpx.AsyncClient(timeout=15)

    async def aclose(self) -> None:
        await self._http.aclose()

    @staticmethod
    def authorize_url(redirect_uri: str, client_id: str) -> str:
        return (
            f"{AUTHORIZE_URL}?client_id={client_id}&response_type=code"
            f"&redirect_uri={redirect_uri}&scope={SCOPES.replace(' ', '+')}"
        )

    async def exchange_code(self, code: str, redirect_uri: str) -> None:
        """One-time: trade the browser-flow's authorization code for the first token pair."""
        await self._request_token(
            {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri}
        )

    async def get_token(self) -> str | None:
        """A valid access token, refreshing first if needed. None if never signed in, or the
        refresh token itself has died (unused for 29 days - needs a fresh browser sign-in)."""
        cache = self._load()
        if not cache:
            return None
        if cache["expires_at"] > time.time() + EXPIRY_SAFETY_MARGIN_SECONDS:
            return cache["access_token"]
        try:
            return await self._request_token(
                {"grant_type": "refresh_token", "refresh_token": cache["refresh_token"]}
            )
        except httpx.HTTPStatusError as exc:
            logger.warning("SmartThings token refresh failed: %s", exc)
            return None

    async def _request_token(self, data: dict[str, str]) -> str:
        response = await self._http.post(
            TOKEN_URL, data=data, auth=(self._client_id, self._client_secret)
        )
        response.raise_for_status()
        body = response.json()
        self._save(
            {
                "access_token": body["access_token"],
                "refresh_token": body["refresh_token"],
                "expires_at": time.time() + body["expires_in"],
            }
        )
        return body["access_token"]

    def _load(self) -> dict[str, Any] | None:
        try:
            return json.loads(self._cache_file.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return None

    def _save(self, cache: dict[str, Any]) -> None:
        fd = os.open(self._cache_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(cache, file)
