# Trinetra

Remote control for your terminal sessions — monitor and interact with long-running CLI tools from your phone.
<img width="2912" height="1440" alt="banner" src="https://github.com/user-attachments/assets/79d935bb-92c0-45cd-b392-79c8a659d774" />

Trinetra mirrors your `tmux` sessions to a mobile web UI. Start a run on your laptop, step away, and still be the one who unblocks it when it asks for input (`y/N` prompts, agent approvals, `Ctrl+C`, etc.).


## Security Warning (read first)

Trinetra is intentionally **local-first** and **single-user** (no auth). Treat it like remote keyboard access to your machine.

Run it only on **localhost** or a trusted private network like **Tailscale**. Do not expose it to the public internet (including **ngrok**, port-forwarding, or **Tailscale Funnel**). If you absolutely must, put it behind your own auth/TLS and fully understand the risk.

## The Pain (and the win)

You kick off something that takes 20 minutes. Then life happens: coffee, commute, meeting.

The CLI doesn't fail when you're away — it waits for a prompt you didn't see. Trinetra turns that dead time into progress: peek in, answer the prompt, and keep going.

## Use Cases

- Approve prompts (`Proceed? (y/N)`) without walking back to your desk
- Interrupt runaway jobs (`Ctrl+C`) before they waste time
- Check build/test/agent progress from anywhere
- Keep multiple repos/sessions moving in parallel

## Features

- **Live Terminal Mirroring** - See exactly what's on your terminal, 1:1
- **Remote Input** - Send commands, special keys (Ctrl+C, Enter, Escape), and text
- **Session Management** - Create, list, and kill tmux sessions
- **Mobile-First UI** - Optimized for phone screens with touch-friendly controls
- **Phase Detection** - Automatic detection of session state (thinking, tool use, idle, etc.)
- **Workspaces & Templates** - Save frequently used project paths and launch commands
- **Works Over Tailscale** - Secure access from anywhere

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

The web UI will be available at `http://localhost:5173` and the API at `http://localhost:3001`.

### Remote Access

#### Via Tailscale

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

#### Via ngrok

```bash
# Recommended: expose the single Docker port (web + API + WebSocket)
docker-compose up -d
ngrok http 8080
```

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

```
trinetra/
├── packages/
│   └── shared/          # Shared TypeScript types
├── apps/
│   ├── server/          # Fastify backend
│   │   └── src/
│   │       ├── index.ts       # Entry point
│   │       ├── db.ts          # SQLite database
│   │       ├── tmux.ts        # tmux adapter
│   │       ├── phase-detector.ts
│   │       ├── ws.ts          # WebSocket handler
│   │       └── routes/        # REST API routes
│   └── web/             # React frontend
│       └── src/
│           ├── api/           # API client
│           ├── components/    # UI components
│           ├── hooks/         # React hooks
│           ├── pages/         # Page components
│           └── stores/        # Zustand stores
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions/:id` | Get session details |
| DELETE | `/api/sessions/:id` | Kill a session |
| GET | `/api/workspaces` | List workspaces |
| POST | `/api/workspaces` | Create a workspace |
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create a template |

### WebSocket Messages

Connect to `/ws` for real-time updates.

**Client → Server:**
- `subscribe` - Subscribe to a pane's output
- `unsubscribe` - Unsubscribe from a pane
- `input` - Send text input
- `key` - Send special key (Ctrl+C, Enter, etc.)

**Server → Client:**
- `snapshot` - Full terminal content
- `status` - Session status update
- `error` - Error message

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
