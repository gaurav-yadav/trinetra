# Trinetra

Remote control for your terminal sessions — monitor and interact with long-running CLI tools from your phone.
<img width="2912" height="1440" alt="banner" src="https://github.com/user-attachments/assets/79d935bb-92c0-45cd-b392-79c8a659d774" />

Trinetra mirrors your `tmux` sessions to a mobile web UI. Start a run on your laptop, step away, and still be the one who unblocks it when it asks for input (`y/N` prompts, agent approvals, `Ctrl+C`, etc.).


## Why

The CLI doesn't fail when you're away — it waits. Trinetra turns that dead time into progress: check status, answer the prompt, and move on.

## Features

- **Needs-attention UX** - Detects `WAITING` / `ERROR`, highlights sessions, and surfaces one-tap actions (y/n/Enter/Ctrl+C)
- **Sessions** - Create/list/kill, search + phase filters, pin important sessions, preview recent output
- **Panes** - Switch between panes (and deep-link via `?pane=0.0`)
- **Terminal ergonomics** - Rolling output buffer (load more), search (Ctrl/Cmd+F), copy last N lines, download logs, jump-to-bottom
- **PWA + notifications** - Installable web app + optional browser notifications for attention-worthy phases
- **Workspaces & templates** - Save repo paths and launch commands consistently

<img width="400" height="752" alt="Screenshot 2026-01-18 at 1 48 56 PM" src="https://github.com/user-attachments/assets/da76221f-dfa0-4e7c-b02d-049ba39f8e87" />
<img width="416" height="752" alt="working" src="https://github.com/user-attachments/assets/36fe9e8b-ddf1-4917-9625-ff6e67ccb602" />

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- tmux

### Local Development

```bash
# Install dependencies
pnpm install

# Build shared package
pnpm --filter @trinetra/shared build

# Start server (in one terminal)
pnpm --filter @trinetra/server dev

# Start web (in another terminal)
pnpm --filter @trinetra/web dev
```

Tip: `just dev` also starts the full stack if you have `just` installed.

The web UI will be available at `http://localhost:5173` and the API at `http://localhost:3001`.

### Remote Access

#### Via Tailscale (Recommended)

Tailscale provides encrypted access over WireGuard with no extra auth needed.

1. Install Tailscale on the machine running Trinetra and on your phone
2. Start the server bound to all interfaces:
   ```bash
   TRINETRA_HOST=0.0.0.0 pnpm --filter @trinetra/server dev
   ```
3. Start Vite bound to all interfaces:
   ```bash
   pnpm --filter @trinetra/web dev -- --host 0.0.0.0
   ```
4. Access via your Tailscale IP: `http://100.x.x.x:5173`

#### Other Options

If you need internet access, put Trinetra behind your own auth (e.g., Cloudflare Tunnel + Access, ngrok OAuth).

### Docker

```bash
# Copy env template
cp .env.example .env

# Build and run
docker-compose up -d

# Access at http://localhost:8080
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile Web    │────▶│  Fastify Server │────▶│      tmux       │
│   (React/Vite)  │◀────│   (WebSocket)   │◀────│    sessions     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

- **Frontend**: React + Vite + Tailwind CSS + Zustand
- **Backend**: Fastify + WebSocket + sql.js (SQLite)
- **Runtime**: tmux for session management

## Project Structure

- `apps/server` - Fastify backend (REST + WebSocket)
- `apps/web` - React + Vite mobile web UI
- `packages/shared` - shared TypeScript types

## API

- REST under `/api`, WebSocket at `/ws`. See `apps/server/src/routes`.

## Troubleshooting

Run `pnpm doctor` to check `tmux`, ports, and the data directory.

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TRINETRA_HOST` | `127.0.0.1` | Server bind address |
| `TRINETRA_PORT` | `3001` | Server port |
| `TRINETRA_DATA_DIR` | `./data` | Data dir (SQLite + logs) |
| `WEB_PORT` | `8080` | Web port (Docker) |

## Session Naming

Sessions created by Trinetra use the prefix `ccp_` (e.g., `ccp_ab12cd`). You can attach to these sessions from iTerm or any terminal:

```bash
tmux attach -t ccp_ab12cd
```

## License

MIT
