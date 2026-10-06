"""One-time sign-in to the SmartThings cloud API: `python -m app.devices.smartthings_login`
(from backend/). Needs SMARTTHINGS_CLIENT_ID and SMARTTHINGS_CLIENT_SECRET in .env, from
registering an OAuth-In app via the SmartThings CLI - see CLAUDE.md's "Tuya devices" bullet
for the steps.

SmartThings' /oauth/authorize endpoint rejects localhost redirect URIs outright (confirmed by
SmartThings staff on the community forum - a 403 "Access forbidden to this app", not anything
wrong with the app config) - it needs a real public HTTPS URL. Since this is a one-time code
capture, not a real running service, this points the redirect at https://httpbin.org/get,
which just echoes back whatever query string it's given - you copy the `code` value it shows
and paste it here, rather than this script catching a local redirect automatically.
"""

from __future__ import annotations

import asyncio

from ..config import SMARTTHINGS_TOKEN_CACHE_FILE, Settings
from .smartthings_auth import SmartThingsTokenProvider

# Must exactly match a redirect URI registered on the OAuth-In app.
REDIRECT_URI = "https://httpbin.org/get"


def main() -> None:
    settings = Settings()
    if not settings.smartthings_client_id or not settings.smartthings_client_secret:
        raise SystemExit(
            "SMARTTHINGS_CLIENT_ID / SMARTTHINGS_CLIENT_SECRET are not set in backend/.env"
        )

    tokens = SmartThingsTokenProvider(
        settings.smartthings_client_id,
        settings.smartthings_client_secret,
        SMARTTHINGS_TOKEN_CACHE_FILE,
    )
    url = SmartThingsTokenProvider.authorize_url(REDIRECT_URI, settings.smartthings_client_id)
    print(f"Open this in your browser and approve access:\n\n{url}\n", flush=True)
    print(
        "You'll land on a page showing raw JSON (httpbin.org echoing the redirect) - find "
        '"code" under "args" and copy its value.',
        flush=True,
    )
    code = input("Paste the code here: ").strip()
    if not code:
        raise SystemExit("No code given.")

    asyncio.run(tokens.exchange_code(code, REDIRECT_URI))
    print("Signed in. A running backend picks this up within a minute.", flush=True)


if __name__ == "__main__":
    main()
