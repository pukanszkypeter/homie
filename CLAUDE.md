# 🏠 Homie

Personal home dashboard: smart-home devices today; planned are a greeting/weather
view, budget and monthly-cost stats, todo integration (add/delete), and a voice
assistant called **Lilly** backed by an AI model that can act inside the app.
Everything device-related stays LAN/localhost-only. Architecture and API details
live in [README.md](README.md), [backend/README.md](backend/README.md) and
[frontend/README.md](frontend/README.md) - don't duplicate them here.

## 🚀 Run

Two terminals (frontend on **8000**, backend on **8001**; CORS and the URLs in
`frontend/src/api.ts` are tied to these):

```bash
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

- Device state goes through `backend/app/devices/registry.py`; anything that
  drives a device (mock now, real hardware later) calls into it. Keep the API and
  frontend unaware of where state comes from.
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
secrets or real personal data (tokens, actual budget numbers, real todo items).
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
- No persistence yet (device state resets on restart) - SQLite is the likely fit
  once budget/todo data exists.
- No general scheduler; background work is an asyncio task started in the lifespan
  (the mock simulator, and the weather refresher in `app/weather/service.py`).
  Follow that pattern until something needs real scheduling.
- No tests yet; add them when real logic lands (registry write validation,
  Graph/budget code).
- No auth on the API, and it exposes the user's real todos. The server listens on
  127.0.0.1 only; add the PIN gate (backend-verified, rate-limited) before binding to
  the LAN or opening it from other devices. See the profiles/roles discussion: start
  with one PIN, add per-user profiles only when someone needs separate data.
