# 🖥️ Homie frontend

React + TypeScript + Vite dashboard for the Homie smart-home backend.
Fetches the device list once over REST, then keeps it live over a
WebSocket, rendering devices as room-grouped cards with type-specific
controls.

Meant to eventually run fullscreen in a tablet's browser (kiosk mode)
mounted on a wall; runs as a normal web app in dev.

## 🔧 Setup

```bash
npm install
```

## 🚀 Running

```bash
npm run dev
```

Serves on http://localhost:8000. The backend must be running on
http://localhost:8001 for the dashboard to load data (see
[../backend/README.md](../backend/README.md)) - both the base URL and the
WebSocket URL are hardcoded in [src/api.ts](src/api.ts).

## 📜 Scripts

- `npm run dev` - start the Vite dev server.
- `npm run build` - type-check (`tsc -b`) then build for production.
- `npm run lint` - run Oxlint.
- `npm run preview` - preview a production build locally.

## 🗂️ Structure

- `src/api.ts` - REST calls (`fetchDevices`, `patchDevice`) and the
  WebSocket connection (`connectDeviceStream`), including auto-reconnect.
- `src/hooks/useDevices.ts` - loads the initial device list, applies live
  WebSocket updates, and exposes `updateDevice` for optimistic-free
  PATCH-then-reconcile writes.
- `src/types.ts` - shared `Device` / `DeviceState` types, mirroring the
  backend's Pydantic models.
- `src/components/DeviceCard.tsx` - renders a single device with
  type-specific controls (on/off + brightness for lights, on/off for
  outlets, read-only for sensors).
- `src/App.tsx` - top-level layout, groups devices by room.

## 📋 Not built yet

- Kiosk-mode styling/behavior for the wall tablet (fullscreen lockdown,
  disabling text selection, hiding the cursor, screen-always-on).
- Auth (none yet - fine for a LAN-only prototype).
