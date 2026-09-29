# 🏠 Homie

Personal home dashboard: smart-home devices today; planned are a greeting/weather
view, budget and monthly-cost stats, todo integration (add/delete), and a voice
assistant called **Lilly** backed by an AI model that can act inside the app.
Everything device-related stays LAN/localhost-only. Architecture and API details
live in [README.md](README.md), [backend/README.md](backend/README.md) and
[frontend/README.md](frontend/README.md) - don't duplicate them here.

## 🚀 Run

Postgres first (`docker-compose.yml`, once), then two terminals (frontend on
**8000**, backend on **8001**; CORS and the URLs in `frontend/src/api.ts` are
tied to these):

```bash
docker compose up -d   # Postgres (data/schema persist in a Docker volume)
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8001
cd frontend && npm run dev
```

## 🧰 Toolchain

- Backend: Python **3.12** (Homebrew, not the macOS system 3.9) in `backend/.venv`,
  FastAPI + uvicorn. Deps pinned in `backend/requirements.txt`.
- Frontend: Node **24** (Homebrew `node@24`), React + TypeScript + Vite.
- Python: Ruff for lint + format (config in `backend/pyproject.toml`), Pylance
  `standard` type checking. Ruff is a VSCode extension, not in the venv.
- Frontend: oxlint for linting (`npm run lint`), Prettier for formatting
  (`npm run format` / `format:check`). No ESLint on purpose.
- Editor settings live in `.vscode/` and are committed.

## 📐 Conventions

- Device state goes through `backend/app/devices/registry.py`; anything that drives a
  device (a real integration like `app/devices/tuya.py`, or a future mock for a type with
  no hardware yet) calls into it. A device with no driver registered writes state directly;
  one with a driver (`register_driver`) has its writes routed through it first, and the
  registry stores whatever the hardware actually confirmed, not the raw request. Keep the
  API and frontend unaware of which kind they're talking to. There's no seeded mock data
  anymore (removed once the first real devices landed) - `registry.seed([])` if nothing's
  configured yet.
- New domains (todos, budget, voice) get their own router in `backend/app/api/`
  and their own module beside `devices/`.
- `frontend/src/types.ts` mirrors the backend Pydantic models; update both together.
- Frontend layout: `layouts/` (app shell), `pages/` (one folder per screen),
  `components/` (reusable), `hooks/`, `styles/tokens.css` (theme). One folder per
  component/page with its own CSS Module; import via the `@/` alias. A new screen
  = a page folder + a route in `router.tsx` + an entry in `components/NavRail/navItems.ts`.
- Todo privacy: only lists named in `MS_TODO_LISTS` (in the gitignored `.env`) are
  fetched; the rest of the user's lists never leave Microsoft. Keep that allowlist
  in the fetch path, don't filter after fetching. The one exception is the opt-in
  cleanup (`MS_TODO_CLEANUP_DAYS`, `app/todos/cleanup.py`), which reads only ids and
  completion times of all lists, never titles, and is off unless the user enables it.
  Never run it with `--delete` (or enable it) without the user's explicit go-ahead.
- Costs: monthly utilities/subscription costs live in Postgres (`docker-compose.yml`,
  a local container; real spending, never seeded with fixtures), managed by Alembic
  migrations in `backend/migrations/` and entered through the Stats screen (no
  spreadsheet import, on purpose). The connection URL is `DATABASE_URL` in `.env`
  (defaults in `app/config.py` to the local `docker-compose.yml` instance, so a fresh
  checkout needs no `.env` entry for it). Amounts are whole forints and may be negative
  (credits); a missing entry means no data, not 0; totals are always computed, never
  stored. An entry's amount can itself be missing (a metered item's quantity logged
  before the bill arrives) - but amount and quantity are never both missing at once
  (`EntryIn` rejects that), and a plain-count item (`unit = "1"`) always needs an
  amount, since its quantity is just a fixed 1, not something actually measured.
  Sections and items are listed per year (`cost_section_years` /
  `cost_item_years`) but keep one identity across years, so removing one only affects
  that year. Sections have a chart color (a key from `backend/app/costs/colors.py`,
  mapped to `--color-chart-<key>` in `tokens.css` - keep both in sync, and re-run the
  dataviz palette validator when changing the palette). Units (kWh, m3) belong to the
  item; the quantity and an optional note (up to 500 characters) belong to the entry
  (one month). Never write test data into the real database - use a temp SQLite
  database (`create_db_engine(tmp_path)`, no server needed) or mocked responses, and
  don't print the user's real cost figures or item names. The database was reset to
  empty on 2026-09-28 (both the pre-Postgres SQLite copy and the live Postgres data
  were deliberately deleted) - the user is re-entering everything through the Stats
  screen from scratch.
- Tuya devices (LEDs, Ledvance Smart+ lamps - both controlled through the Tuya app) are
  integrated locally, not through Tuya's cloud API or SmartThings' cloud-to-cloud bridge -
  see `app/devices/tuya.py`. Each device's `device_id` and `local_key` are a one-time pull
  from Tuya's IoT developer console (create a free project, "Link Tuya App Account" to scan
  a QR code from the phone app, then read the values off the linked device); after that,
  every read/write is a direct LAN call, no cloud involved. Devices are configured in the
  gitignored `backend/tuya_devices.json` (copy `tuya_devices.example.json`), one entry per
  device with a `dps` map from Homie's state keys (`is_on`, `brightness`, `color_temp`) to
  that device's Tuya data-point indices - these vary by product (DP "1" is a near-universal
  switch, but a bulb's brightness/color DPs depend on its category), so don't trust the
  example file's numbers for a different device. A key whose DP uses a non-1-100 native
  range (10-1000 is common) needs a matching `brightness_range`/`color_temp_range` in the
  config so `TuyaDriver` can convert both ways - leave it unset for a DP that's already ~0-100.
  Not every light has a `color_temp` DP; a Tuya "single_color" fixture (brightness-only, no
  physical color-mixing hardware) still accepts and reports one if you add it, since the Tuya
  app shows the same generic slider regardless of what the fixture can actually do - flag
  that in the config's `notes` (surfaced in the UI next to the control) rather than omitting
  the DP outright, which is a legitimate reason to write one. `set_multiple_values`/`status`
  calls are blocking, so `TuyaDriver` runs them via `asyncio.to_thread` rather than in the
  event loop. Samsung gear (TV, speakers, AC, all via SmartThings) is the deliberate
  exception to LAN-only - see the open decisions below.
- Todos: Microsoft To Do is the source of truth (accessible everywhere, shared lists
  with other people); Homie is a wall view plus quick add/complete/delete, not a
  replacement. The backend caches open tasks only and validates list/task ids against
  that cache (Graph returns 400 for unknown list ids and silently succeeds for some
  unknown task ids, so it can't be trusted for 404s).
- Recurring tasks: completing one does NOT create a new task. Microsoft advances the
  same task (same id) in place, reopened with the next due date, and stores the finished
  occurrence as a separate completed task. Trust the PATCH reply's status/due date, not
  the fact that we asked for "completed". Deleting only completed instances is safe.
- Due dates: Graph returns them in UTC as the user's local midnight, so always convert
  to the `TIMEZONE` setting (default: the machine's) before taking the date. Don't slice
  the string. Test date logic with values around midnight and DST changes.
- **Never run mutating requests against the user's real data except scratch tasks you
  create yourself** (title them "Homie ..." and delete them right after), on a
  non-shared list. Don't derive ids by editing real ones (that once produced an id
  identical to a real task's). Don't print the user's real task titles into the session;
  use counts. Verify with a scan that no scratch tasks are left behind.
- UI targets a wall tablet first (dark, glanceable, 64px touch targets) but must
  stay usable on phone/desktop; use theme tokens instead of hardcoded values.
- Commits: clear, present-tense messages. No semver, changelog, or GitHub Projects
  board - deliberately skipped. Don't commit unless asked.

## ⚠️ Public repo - keep it clean

The GitHub repo is **public** (used as a resume reference). Never commit real
secrets or real personal data (tokens, actual cost figures, real todo items).
Use synthetic data in the repo. Real credentials go in the gitignored `backend/.env`,
never in code. Personal config follows the same rule: the weather
places live in the gitignored `backend/locations.json` (home location is personal),
with a committed `locations.example.json`. Never put the user's real home location or
travel places in committed files, docs, or examples. The same goes for their real
todo list names/tasks.

Secrets live in `backend/.env` (read by `app/config.py`) and the Microsoft sign-in
cache `backend/.msal_token_cache.json` (holds refresh tokens - a secret, owner-only,
gitignored). Setup is in `backend/README.md`.

## 🔜 Open decisions / known gaps

- Lilly's brain: fully local model (Ollama/llama.cpp, matches the localhost ethos,
  weaker tool-calling) vs a cloud API (more reliable, leaves the LAN). Undecided.
- Device state has no persistence yet (resets on restart); the costs data already
  uses Postgres, so reuse that setup (`app/costs/db.py`, Alembic) when devices need it.
  Matters less for a real device than a mock one, though - the hardware itself is the
  source of truth, so persistence would mostly be about caching/history, not necessity.
- Samsung devices (TV, speakers, AC) are planned to go through the SmartThings cloud API
  (a Personal Access Token), one driver for all three rather than a local-only exception
  just for the TV - deliberately breaking the LAN-only rule for this one vendor, since
  the other two need SmartThings' cloud regardless and a second Samsung-specific local
  protocol wouldn't avoid a cloud dependency, just duplicate one. Not built yet.
- A home security/alarm app (Versa) was mentioned as a future integration target; holding
  off - arm/disarm is safety-relevant enough that it deserves its own careful look (and
  confirmed API research) before wiring up write access, more so than the other devices.
- No general scheduler; background work is an asyncio task started in the lifespan
  (`run_tuya_poller` in `app/devices/tuya.py`, and the weather refresher in
  `app/weather/service.py`). Follow that pattern until something needs real scheduling.
- No tests yet; add them when real logic lands (registry write validation,
  Graph/budget code).
- No auth on the API, and it exposes the user's real todos. The server listens on
  127.0.0.1 only; add the PIN gate (backend-verified, rate-limited) before binding to
  the LAN or opening it from other devices. See the profiles/roles discussion: start
  with one PIN, add per-user profiles only when someone needs separate data.
