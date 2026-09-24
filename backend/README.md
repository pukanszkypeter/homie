# ⚙️ Homie backend

FastAPI service that exposes smart-home devices over REST and pushes live
state changes over a WebSocket. Devices are currently mocked - see
[Mock devices](#mock-devices) below.

## 🔧 Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp locations.example.json locations.json
```

Edit `locations.json` to list the places for the weather card, as
`{"name": ..., "latitude": ..., "longitude": ...}` entries; the first one is the
home city. The file is gitignored because your home location is personal data.
Without it the app still runs and `/api/weather` returns no locations. Coordinates
can be looked up with Open-Meteo's geocoding API
(`https://geocoding-api.open-meteo.com/v1/search?name=<city>`).

### 📝 Microsoft To Do (optional)

The todos come from your real Microsoft To Do (personal account) through the
Microsoft Graph API. One-time setup:

1. In [Microsoft Entra](https://entra.microsoft.com) → *App registrations* →
   *New registration*: any name, supported account types **Personal Microsoft
   accounts only**, no redirect URI.
2. On the app: *Authentication* → *Allow public client flows* = **Yes**;
   *API permissions* → Microsoft Graph → Delegated → `Tasks.ReadWrite` and
   `Tasks.ReadWrite.Shared` (the latter is needed for lists shared with others).
   No client secret is needed.
3. `cp .env.example .env` and set `MS_CLIENT_ID` to the app's *Application
   (client) ID*, and `MS_TODO_LISTS` to the names of the lists to show
   (comma-separated). Only those lists are ever fetched; all your other lists
   stay private, and nothing is shown if it's empty. `.env` is gitignored.
4. Sign in once: `.venv/bin/python -m app.todos.login`, then open the shown
   link on any device and enter the code. A running backend picks the sign-in
   up within a minute.

**Cleaning up old completed tasks.** Microsoft To Do never removes completed tasks
by itself. `MS_TODO_CLEANUP_DAYS=30` in `.env` makes the backend delete tasks
completed more than 30 days ago, from **all** your lists (including ones not in
`MS_TODO_LISTS`; only ids and completion times are read, never titles), once a day,
at most 500 per run. It is permanent, and in shared lists it removes the items for
everyone. Preview or run it by hand first:

```bash
.venv/bin/python -m app.todos.cleanup --days 30           # dry run, counts only
.venv/bin/python -m app.todos.cleanup --days 30 --delete  # really delete
```

Deleting a completed instance of a recurring task is safe: its next occurrence is a
separate open task.

**Due dates and your timezone.** To Do stores a due date as local midnight but reports
it in UTC (midnight on the 27th in UTC+2 arrives as the 26th at 22:00), so the backend
converts it into your timezone to find the right day. It uses this machine's timezone
by default; set `TIMEZONE` (an IANA name like `Europe/London`) in `.env` on a server
that runs in UTC, such as a NAS.

Sign-in tokens are stored in `.msal_token_cache.json` (owner-only, gitignored) -
treat it like a password. Without `MS_CLIENT_ID` the app still runs and the
todo widgets show that To Do isn't set up.

## 🚀 Running

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

Serves on http://localhost:8001. CORS is locked to `http://localhost:8000`
(the frontend dev server) in [app/main.py](app/main.py).

## 📡 API

- `GET /api/health` - liveness check.
- `GET /api/devices` - list all devices.
- `GET /api/devices/{device_id}` - fetch one device.
- `PATCH /api/devices/{device_id}` - partial state update, e.g.
  `{"state": {"is_on": true}}`. Only keys listed in
  `WRITABLE_STATE_KEYS` (see [app/devices/models.py](app/devices/models.py))
  are accepted per device type; sensors are read-only.
- `GET /api/todos` - your Microsoft To Do lists with their open tasks (each with an
  optional `due_date` and an `is_recurring` flag), plus a
  `status` (`ok`, `loading`, `sign_in_required`, `not_configured`, `unavailable`).
  Served from a cache refreshed every 60 seconds.
- `POST /api/todos/lists/{list_id}/tasks` - add a task, body `{"title": "..."}`.
- `PATCH /api/todos/lists/{list_id}/tasks/{task_id}` - complete a task, body
  `{"is_completed": true}`. Returns the task. A recurring task comes back **open
  again with its next due date** (Microsoft advances it in place and keeps the
  finished occurrence as a separate completed task); a plain task comes back completed.
- `DELETE /api/todos/lists/{list_id}/tasks/{task_id}` - delete a task. Unknown
  list or task ids return 404; if To Do can't be used right now they return 503.
  Only open tasks are cached, so completed tasks can't be reopened or deleted here.
- `GET /api/weather` - current conditions and a 4-day forecast for every
  configured location, plus when it was last refreshed. Coordinates are not
  included. Served from a cache refreshed every 15 minutes (retried every minute
  while failing, keeping the previous data meanwhile).
- `WS /ws` - subscribe to device state changes. The server pushes a message
  on every update (from a `PATCH` or from the simulator); the client doesn't
  need to send anything.

## 🗂️ Structure

- `app/main.py` - app setup, CORS, lifespan (seeds the registry, then starts
  the mock simulator and the weather refresher on startup).
- `app/api/devices.py` - REST routes.
- `app/api/weather.py`, `app/api/todos.py` - the weather and todo routes.
- `app/config.py` - settings read from the gitignored `.env`, and the token
  cache path.
- `app/todos/` - the Microsoft To Do domain: `models.py`, `auth.py` (sign-in
  and token cache via MSAL), `client.py` (Graph API calls), `service.py`
  (cache, refresh loop, id validation), `login.py` (the one-time sign-in command),
  `cleanup.py` (old completed tasks: dry-run command and the daily job).
- `app/weather/` - the weather domain: `models.py` (Pydantic models),
  `locations.py` (loads `locations.json`), `client.py` (Open-Meteo requests and
  parsing, all locations in one call), `service.py` (cache plus the background
  refresh loop).
- `app/api/ws.py` - WebSocket route.
- `app/devices/models.py` - `Device` / `DeviceUpdate` Pydantic models and
  the per-type writable-state-key allowlist.
- `app/devices/registry.py` - in-memory device store. This is the seam
  between the API and whatever actually drives a device: it handles reads,
  validated writes, and fanning out updates to WebSocket subscribers. A
  real integration (MQTT, Zigbee, Home Assistant, vendor APIs) would be
  something else that calls into this registry, replacing
  `devices/mock.py` - the API and frontend wouldn't need to change.
- `app/devices/mock.py` - seeds the fake devices and jitters sensor/outlet
  readings on a timer to simulate live activity.

## 🧪 Mock devices

Living Room (light, outlet, temperature sensor), Bedroom (light, humidity
sensor), Kitchen (outlet). State resets to the seed data on restart -
there's no persistence yet.

## 🙏 Data sources

Weather data by [Open-Meteo.com](https://open-meteo.com/) (free for non-commercial
use, attribution required - the weather card shows it). Todos through the
[Microsoft Graph](https://learn.microsoft.com/graph/api/resources/todo-overview) To Do API.

## 📋 Not built yet

- Real device integrations (protocol deliberately undecided; additive via
  the registry, not a rewrite).
- Persistence.
- Auth. The API has none and the server only listens on this machine
  (`127.0.0.1`) by default. Before exposing it to the network (phone, tablet),
  add a PIN: the todo endpoints hand out your real Microsoft To Do data.
