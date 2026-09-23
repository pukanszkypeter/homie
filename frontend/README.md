# 🖥️ Homie frontend

React + TypeScript + Vite dashboard for the Homie backend. A dark,
touch-friendly app shell (icon rail on tablet/desktop, bottom bar on phones)
with a Home overview and separate screens for Devices, Todos and Stats.
Devices load once over REST, then stay live over a WebSocket.

Meant to eventually run fullscreen in a tablet's browser (kiosk mode)
mounted on a wall; also usable from a phone or desktop browser.

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

Imports use the `@/` alias for `src/` (e.g. `@/components/Widget/Widget`).
Components and pages keep their code and their scoped CSS Module together in
one folder.

- `src/main.tsx`, `src/App.tsx`, `src/router.tsx` - entry point, root, and the
  route table (`/`, `/devices`, `/todos`, `/stats`; unknown paths redirect Home).
- `src/styles/` - `tokens.css` (colors, spacing, sizes, touch-target size -
  the single place to change the theme) and `global.css` (reset and base).
- `src/layouts/AppShell/` - the frame around every screen: nav area plus the
  content outlet. Switches to a bottom bar under 768px wide.
- `src/components/` - reusable pieces: `NavRail` (rail on wide areas, bar on
  narrow ones; nav entries live in `navItems.ts`), `Widget` (Home card),
  `PageHeader`, `ComingSoon`, and `DeviceCard` (one file per control type).
- `src/pages/` - one folder per screen: `HomePage` (greeting, clock, widget
  grid), `DevicesPage` (rooms and device cards), `TodosPage` and `StatsPage`
  (placeholders).
- `src/hooks/` - `useDevices` (initial load, live WebSocket updates,
  PATCH-then-reconcile writes) and `useClock`.
- `src/api.ts` - REST calls and the WebSocket connection, with auto-reconnect.
- `src/types.ts` - `Device` / `DeviceState` types, mirroring the backend's
  Pydantic models.

## 📋 Not built yet

- Real content for the Home widgets and the Todos/Stats screens (weather,
  todos, budget); the Lilly voice button in the nav is a disabled placeholder.
- Kiosk-mode styling/behavior for the wall tablet (fullscreen lockdown,
  disabling text selection, hiding the cursor, screen-always-on).
- Auth (none yet - fine for a LAN-only prototype).
