# 🏠 Homie

A hobby smart-home dashboard. For now, the backend simulates devices with
mock data instead of talking to real hardware, so the whole thing runs on a
Mac with no Raspberry Pi / tablet / real devices required. The frontend is a
normal web app in dev, meant to eventually run fullscreen in a tablet's
browser (kiosk mode) mounted on a wall.

## 🏗️ Architecture

- `backend/` - Python + FastAPI. Exposes devices over REST (`GET`/`PATCH
  /api/devices`) and pushes live state changes over a WebSocket (`/ws`).
  Device state lives in `app/devices/registry.py`, an in-memory store that's
  meant to be the seam between the API and whatever actually drives a
  device. `app/devices/mock.py` seeds fake devices and jitters sensor/outlet
  readings on a timer to simulate real activity. Swapping in a real
  integration later (MQTT, Zigbee, Home Assistant, direct vendor APIs) means
  writing something else that calls into the registry - the API and
  frontend don't need to change.
  Weather comes from Open-Meteo (free, no API key): the backend refreshes it
  every 15 minutes for the places in `backend/locations.json` and serves the
  cached result to every client.
- `frontend/` - React + TypeScript + Vite. Fetches the device list once,
  then keeps it live over the WebSocket. Devices are grouped by room and
  rendered as cards with type-specific controls (on/off + brightness for
  lights, on/off for outlets, read-only for sensors). Home shows a greeting,
  clock and a weather card with a switch between the configured cities.

## 🚀 Running it

Two terminals:

```bash
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

## 🧪 Current mock devices

Living Room (light, outlet, temperature sensor), Bedroom (light, humidity
sensor), Kitchen (outlet). Sensor values and the on-outlet power draw drift
randomly every few seconds to simulate live data.

## 📋 Not built yet (intentionally)

- Real device integrations (protocol choice - MQTT/Zigbee/Home Assistant/
  vendor APIs - deliberately deferred; the registry abstraction is there so
  this is additive, not a rewrite).
- Cloud service integrations (Microsoft Graph: OneDrive files, To Do,
  budget/stats views) - planned as a separate module alongside `devices/`,
  not started.
- Kiosk-mode styling/behavior for the tablet (fullscreen lockdown, disabling
  text selection, hiding the cursor, screen-always-on).
- Persistence - device state resets to the seed data on backend restart.
- Auth - there is none; fine for a LAN-only prototype, not fine once
  cloud service tokens are involved.
