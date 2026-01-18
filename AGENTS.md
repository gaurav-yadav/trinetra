# Trinetra — Agent Notes

## What this repo is

Trinetra is a **mobile-first control plane for `tmux`**: mirror terminal output to a web UI and send input (including special keys like `Ctrl+C`) over a trusted network (typically Tailscale).

Design intent: **local-first, single-user, no auth**.

## Repo layout (pnpm workspaces)

- `apps/server` — Fastify + WebSocket backend (talks to `tmux`, streams pane output, stores metadata in SQLite via `sql.js`)
- `apps/web` — React + Vite + Tailwind frontend
- `packages/shared` — shared TypeScript types

## Common commands

- Install: `pnpm install`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Dev (all packages): `pnpm dev`
- Dev (server only): `pnpm dev:server`
- Dev (web only): `pnpm dev:web`

If you change `packages/shared`, rebuild it (`pnpm --filter @trinetra/shared build`) before running server/web.

## Configuration

- Server: `TRINETRA_HOST`, `TRINETRA_PORT`, `TRINETRA_DATA_DIR`
- Web: `VITE_API_URL`, `VITE_WS_URL` (Vite reads from `.env`)

## Generated / local-only files

Do not commit:

- `node_modules/`
- `dist/`
- runtime data/logs (e.g. `apps/server/data/`, `./data/`)
- local tool configs (e.g. `.claude/settings.local.json`)

## Security footnote

This project is effectively **remote keyboard access** to a machine via `tmux`. Prefer private networking (Tailscale). If anything is exposed publicly, it must be placed behind external auth/TLS.
