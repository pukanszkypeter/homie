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
- UI targets a wall tablet first (dark, glanceable, 64px touch targets) but must
  stay usable on phone/desktop; use theme tokens instead of hardcoded values.
- Commits: clear, present-tense messages. No semver, changelog, or GitHub Projects
  board - deliberately skipped. Don't commit unless asked.

## ⚠️ Public repo - keep it clean

The GitHub repo is **public** (used as a resume reference). Never commit real
secrets or real personal data (tokens, actual budget numbers, real todo items).
Use synthetic data in the repo. There is no `.env` yet; when the first real
credential arrives (Graph tokens, weather API key), set up a gitignored `.env`
*before* it touches the code.

## 🔜 Open decisions / known gaps

- Lilly's brain: fully local model (Ollama/llama.cpp, matches the localhost ethos,
  weaker tool-calling) vs a cloud API (more reliable, leaves the LAN). Undecided.
- No persistence yet (device state resets on restart) - SQLite is the likely fit
  once budget/todo data exists.
- No scheduler yet (greeting, weather refresh); the existing asyncio-task-in-lifespan
  pattern (the mock simulator) is the model to follow.
- No tests yet; add them when real logic lands (registry write validation,
  Graph/budget code).
- No auth; fine for LAN-only, not once cloud tokens are involved.
