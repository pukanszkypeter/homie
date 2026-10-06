# 🏠 Homie

A hobby smart-home dashboard that controls real devices: lights over the local
network (Tuya protocol) and Samsung air conditioners and a soundbar through the
SmartThings cloud API. Without any device configured it still runs, just with an
empty Devices screen. The frontend is a normal web app in dev, meant to
eventually run fullscreen in a tablet's browser (kiosk mode) mounted on a wall.

## 🏗️ Architecture

- `backend/` - Python + FastAPI. Exposes devices over REST (`GET`/`PATCH
  /api/devices`) and pushes live state changes over a WebSocket (`/ws`).
  Device state lives in `app/devices/registry.py`, an in-memory store that's
  the seam between the API and whatever actually drives a device. Each
  integration registers a driver per device: `app/devices/tuya.py` talks to
  lights directly on the LAN, `app/devices/smartthings.py` to Samsung air
  conditioners and a soundbar through SmartThings' cloud API (OAuth). Writes go
  through the driver and the registry stores what the hardware confirmed; a
  poller per integration keeps the state fresh. The API and frontend don't
  know which kind of device they're talking to.
  Weather comes from Open-Meteo (free, no API key): the backend refreshes it
  every 15 minutes for the places in `backend/locations.json` and serves the
  cached result to every client.
  Monthly household costs (utilities, subscriptions) live in a local Postgres
  database (`docker-compose.yml`) behind `/api/costs`; totals are
  computed on request, sections and items are listed per year, and items can carry a unit (kWh, m3) so the price per
  unit can be charted.
- `frontend/` - React + TypeScript + Vite. Fetches the device list once,
  then keeps it live over the WebSocket. Devices are grouped by floor and
  rendered as compact tiles: a tap toggles the device, the tile is tinted by
  its state (a lamp's color temperature and brightness, an AC's mode), and a
  dialog holds the full controls. Each floor has a summary and one control
  that sets all its lit lamps together. Home shows a greeting, clock, a
  weather card with a switch between the configured cities and a per-floor
  devices summary.
  The Stats screen charts the monthly costs and is where they are entered.

## 🚀 Running it

Postgres, then two terminals:

```bash
# database (once, stays up between runs)
docker compose up -d

# backend (http://localhost:8001)
cd backend
source .venv/bin/activate   # venv already created; see below if missing
uvicorn app.main:app --reload --port 8001

# frontend (http://localhost:8000)
cd frontend
npm run dev
```

Open http://localhost:8000. Backend must be running for the dashboard to
load data (CORS is currently locked to `localhost:8000`).

### 🔧 First-time backend setup (already done once, for reference)

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp locations.example.json locations.json   # then edit: your places for the weather card
```

`locations.json` is gitignored on purpose (your home location is personal
data); the first entry is the home city. Without it the app still runs, the
weather card just shows "Weather not available".

## 💡 Devices

Devices are configured in two gitignored files in `backend/`, each with a
committed example to copy: `tuya_devices.json` (lights) and
`smartthings_devices.json` (air conditioners, speaker). The one-time setup for
both - reading a Tuya device's local key, registering the SmartThings OAuth
app and signing in - is described in [CLAUDE.md](CLAUDE.md).

## 📋 Not built yet (intentionally)

- Kiosk-mode styling/behavior for the tablet (fullscreen lockdown, disabling
  text selection, hiding the cursor, screen-always-on).
- Persistence for devices - state is re-read from the hardware after a backend
  restart, and there is no history (costs are stored in Postgres).
- Auth - there is none; fine for a LAN-only prototype, not fine once
  cloud service tokens are involved.
