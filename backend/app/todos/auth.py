from __future__ import annotations

import logging
import os
from collections.abc import Callable
from pathlib import Path

import msal

logger = logging.getLogger(__name__)

# "consumers" = personal Microsoft accounts only (matches the app registration).
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPES = ["Tasks.ReadWrite", "Tasks.ReadWrite.Shared"]


class TokenProvider:
    """Hands out Microsoft Graph access tokens from a token cache kept in a file.

    The file is shared with the one-time login command, so signing in from another
    process is picked up without restarting the server. It holds refresh tokens, so
    it is a secret: gitignored and written owner-only.
    """

    def __init__(self, client_id: str, cache_file: Path) -> None:
        self._client_id = client_id
        self._cache_file = cache_file
        self._cache = msal.SerializableTokenCache()
        self._cache_mtime: float | None = None
        self._app: msal.PublicClientApplication | None = None

    def get_token(self) -> str | None:
        """Return a valid access token, or None if nobody is signed in. Blocking."""
        self._reload_cache()
        app = self._get_app()
        accounts = app.get_accounts()
        if not accounts:
            return None
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
        self._save_cache()
        if not result or "access_token" not in result:
            if result:
                logger.warning(
                    "Microsoft token refresh failed: %s",
                    result.get("error_description") or result.get("error"),
                )
            return None
        return result["access_token"]

    def sign_in_with_device_code(self, show_message: Callable[[str], None]) -> None:
        """Sign in via the device code flow: the user approves on another device. Blocking."""
        app = self._get_app()
        flow = app.initiate_device_flow(scopes=SCOPES)
        if "user_code" not in flow:
            raise RuntimeError(flow.get("error_description") or "Could not start sign-in")
        show_message(flow["message"])
        result = app.acquire_token_by_device_flow(flow)
        self._save_cache()
        if "access_token" not in result:
            raise RuntimeError(result.get("error_description") or "Sign-in failed")

    def _get_app(self) -> msal.PublicClientApplication:
        # Created lazily: constructing it contacts Microsoft, which must not break startup.
        if self._app is None:
            self._app = msal.PublicClientApplication(
                self._client_id, authority=AUTHORITY, token_cache=self._cache
            )
        return self._app

    def _reload_cache(self) -> None:
        try:
            mtime = self._cache_file.stat().st_mtime
        except FileNotFoundError:
            return
        if mtime != self._cache_mtime:
            self._cache.deserialize(self._cache_file.read_text(encoding="utf-8"))
            self._cache_mtime = mtime

    def _save_cache(self) -> None:
        if not self._cache.has_state_changed:
            return
        fd = os.open(self._cache_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(self._cache.serialize())
        self._cache.has_state_changed = False
        self._cache_mtime = self._cache_file.stat().st_mtime
