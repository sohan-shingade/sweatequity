# SweatEquity

A fitness accountability app for couples. Pair up with a partner, set weekly workout goals, and put real money on the line — every missed workout costs you. Real-time synced dashboards, photo proof of workouts, year-long heatmaps, weekly battle summaries, and food logging with AI macro estimates.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind
- **Backend**: single zero-dependency Node server (`server/index.mjs`)
  - SQLite via Node's built-in `node:sqlite` (no npm deps)
  - Photos stored as files in `server/data/photos/`
  - Live sync via SSE (`/api/events`)
  - Serves the built frontend from `dist/` — the server is the whole deployment
- **Food macros**: the server shells out to `claude -p` (Claude Code headless, subscription login — no API key). Photo + description in, `{calories, protein, carbs, fat}` out.

## Auth

Name-based signup returns a bearer token — that token (stored in localStorage) is the only credential. To log in on a second device, copy it from Settings → Access Token and paste it into the sign-in screen.

## Development

```sh
npm install
node server/index.mjs        # backend on :8790
npm run dev                  # vite on :5173, proxies /api and /photos to :8790
```

Requires Node 22+ (`node:sqlite`). The experimental-sqlite warning on startup is harmless.

## Deployment (always-on Mac)

```sh
git clone <repo> && cd sweatequity
npm install
npm run build                # -> dist/
node server/index.mjs        # serves app + API on :8790
```

Keep it alive with launchd (or `while true; do node server/index.mjs; done`). Env overrides:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `8790` | listen port |
| `SWEAT_DATA_DIR` | `server/data` | SQLite DB + photos |
| `CLAUDE_BIN` | `~/.local/bin/claude` | claude CLI for food analysis (machine must be logged in to Claude Code) |

Expose it however you like (Tailscale, tunnel, reverse proxy) — everything is same-origin so no extra config is needed.
