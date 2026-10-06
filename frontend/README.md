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
  `PageHeader`, `DevicesWidget` (Home card: per floor, the temperature, one dot per lamp in
  its own color, and what is on), `DeviceTile` (the compact tile on the Devices screen - tap
  toggles, the corner button opens a dialog with the full controls; one tile file per device
  type), `DeviceCard` (those per-type controls shown inside the dialog) and
  `ChipGroup` (the pill switcher used for cities and todo lists), `TodoCard`
  (Home widget), `TaskRow` (shows the due date, red when overdue, and a repeat
  icon for recurring tasks) and `TodoStatusMessage`, and
  `WeatherCard` (city switcher, current conditions, 3-day forecast; WMO weather
  codes are mapped to labels/icons in `weatherCodes.ts`), `Dialog` (modal shell used by the
  Stats screen's popups and the device tiles) and `Combobox` (a text field with suggestions, keyboard-navigable,
  used for picking a cost item's unit - our own since `<datalist>` can't be restyled).
- `src/pages/` - one folder per screen: `HomePage` (greeting, clock, widget
  grid), `DevicesPage` (one section per floor: a summary header with the floor temperature and
  an "Adjust lights" dialog that sets every lit lamp on the floor at once, then the device tiles), `TodosPage` (list switcher, add,
  complete, delete with confirmation) and `StatsPage` (yearly cost charts, grouped bars per section
  side by side rather than stacked, and a grid; each section switches independently between
  Price and Unit view (Unit shows quantity in the item's own unit, "-" where an item has no
  unit or the month has no quantity, and item/footer totals only sum quantities within one
  item, never across items with different units). Tapping a cell enters that month's cost,
  quantity and an optional note - a small dot marks a cell that has one; tapping an item
  shows its history and price per unit).
  Sections can be renamed, recolored (one of nine chart colors) and moved up or down;
  items can be renamed, moved and have their unit changed (a `Combobox` suggests units
  already used elsewhere - a small custom dropdown rather than the browser's native
  `<datalist>` popup, whose look we can't control and which Safari/iOS doesn't render
  at all; changing a unit doesn't convert stored quantities, so it warns when a month
  already has one). Moving uses buttons, not dragging, which is fiddly on a touch
  screen. Years are added with "+ Year", can copy the previous year's sections and
  items, and can be deleted with a confirmation that counts what is lost.
- `src/hooks/` - `useDevices` (initial load, live WebSocket updates,
  PATCH-then-reconcile writes), `useTodos` (polls every 30 seconds; complete/delete update the screen
  instantly and roll back on failure; a completed recurring task is put straight back
  with its next due date), `useWeather` (polls every 5 minutes, every 10
  seconds until the backend has data), `useCostYear` / `useCostSummary` (costs)
  and `useClock`. Charts use recharts, styled through the theme tokens.
- `src/utils/` - small shared helpers (`formatTime` in 24h, `formatDue` for
  "Today" / "Tomorrow" / dates).
- `src/api.ts` - REST calls and the WebSocket connection, with auto-reconnect.
- `src/types.ts` - `Device` / `DeviceState` types, mirroring the backend's
  Pydantic models.

## 📋 Not built yet

- Real content for the Devices widget; the Lilly voice button in the nav is a
  disabled placeholder.
- Kiosk-mode styling/behavior for the wall tablet (fullscreen lockdown,
  disabling text selection, hiding the cursor, screen-always-on).
- Auth (none yet - fine for a LAN-only prototype).
