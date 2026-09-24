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
- `app/api/weather.py` - the weather route.
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
use, attribution required - the weather card shows it).

## 📋 Not built yet

- Real device integrations (protocol deliberately undecided; additive via
  the registry, not a rewrite).
- Persistence.
- Auth (fine for a LAN-only prototype; not fine once cloud tokens are
  involved).
