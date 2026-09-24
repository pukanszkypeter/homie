"""One-time sign-in to Microsoft To Do: `python -m app.todos.login` (from backend/)."""

from __future__ import annotations

from ..config import TOKEN_CACHE_FILE, Settings
from .auth import TokenProvider


def main() -> None:
    settings = Settings()
    if not settings.ms_client_id:
        raise SystemExit("MS_CLIENT_ID is not set in backend/.env")

    tokens = TokenProvider(settings.ms_client_id, TOKEN_CACHE_FILE)
    tokens.sign_in_with_device_code(lambda message: print(message, flush=True))
    print("Signed in. A running backend picks this up within a minute.", flush=True)


if __name__ == "__main__":
    main()
