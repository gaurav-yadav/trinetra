Trinetra

# Terminal Control Plane (Mobile-First) — Product + Technical Specification

Owner intent: local-first webapp that lets me create/observe/control multiple long-running CLI sessions (Claude Code, Codex, tests, scripts) from mobile over Tailscale. Desktop continues to use iTerm as the preferred terminal client. Runtime of record is **tmux**.

This document is written for an autonomous coding agent (Codex) to implement on my laptop.

---

## 0) Goals

### Primary goals

1. **Mobile-first control plane** for multiple concurrent terminal sessions:
   - List all sessions
   - Open a session
   - See live output stream
   - Send input (commands/keys)
   - Interrupt/stop/kill
   - Create new sessions from saved workspace paths/templates
2. **Resumability**: sessions remain alive independent of browser/app lifecycle.
3. **Local-first, single-user**: no auth, no multi-tenancy.
4. **Remote access via Tailscale**: works from phone on Tailscale network.

### Non-goals (for v1)

- Full terminal emulator parity in the browser (mouse, selection, true interactive apps)
- Perfect PTY fidelity for curses apps
- Managing SSH keys or secrets
- Multi-user concurrency or permissions

---

## 1) High-Level Architecture

### System of record

- **tmux** is the runtime: sessions/windows/panes persist across UI restarts.
- iTerm remains a desktop client that can attach to tmux sessions as usual.

### Components

1. **Backend (Node.js + TypeScript)**
   - Runs locally on laptop
   - Provides REST + WebSocket API
   - Executes tmux commands via `child_process` (no direct tmux library required)
   - Maintains metadata store (SQLite) for:
     - Workspaces (saved paths/templates)
     - App sessions (mapping to tmux identifiers)
     - Event index / activity timestamps (optional)
2. **Frontend (React + TypeScript, mobile-first)**
   - Lists sessions and workspaces
   - Session detail: Status view + Terminal view
   - Uses WebSocket for live output + actions
3. **Streaming mechanism**
   - For each tmux pane, configure **pipe-pane** output to a logfile.
   - Backend tails logfile(s) and streams to UI.
   - Fallback for reliability/resync: `tmux capture-pane` snapshot.

---

## 2) Functional Requirements

### 2.1 Workspaces (saved paths)

- User can save 4–5 frequently used repo paths.
- Workspace fields:
  - `id` (uuid)
  - `name` (string)
  - `path` (absolute path)
  - `defaultTemplateId` (optional)
  - `envHint` (optional string; display-only)
- Workspace actions:
  - Create / Edit / Delete workspace
  - "Open new session" from workspace
  - "Open last session" shortcut (if available)

### 2.2 Templates (launch presets)

Templates simplify launching common workflows (Claude Code, Codex, tests).
Template fields:

- `id` (uuid)
- `name` (e.g., "Codex", "Claude Code", "Dev Server", "Tests")
- `command` (shell string to run)
- `autoRun` (boolean; if false, just open shell in path)
- `shell` (optional override; default user's login shell)
- `preCommands` (array of shell strings; run before main command)
- `postCommands` (array of shell strings; run after main command; optional)

Template actions:

- Create / Edit / Delete template
- Launch template in a new tmux pane (default: new window inside session)

### 2.3 Sessions (tmux-backed)

A “Session” in the webapp maps to:

- tmux session name: `ccp_<shortId>`
- tmux window: `0` (default)
- tmux pane: `0` (default) for the initial run

Session fields:

- `id` (uuid)
- `tmuxSession` (string; e.g., `ccp_ab12cd`)
- `workspaceId` (optional)
- `title` (string; e.g., "credcore • codex • build api")
- `createdAt`, `lastActivityAt`
- `status`: `RUNNING | IDLE | EXITED | ERROR` (best-effort)
- `activePane`: reference `windowIndex.paneIndex`

Session actions:

- List sessions (including those discovered directly from tmux)
- Open session detail
- Rename title
- Kill session (kills tmux session)
- Create new window/pane in session
- Switch active window/pane

### 2.4 Terminal output: live stream + resync

- UI must show live appended output for the active pane.
- On reconnect, UI must resync:
  1. request last N lines via backend snapshot (`capture-pane`)
  2. then continue live tail stream
- Output chunk size: stream line-based or chunk-based; preserve newlines.

### 2.5 Input/controls

Input types:

- Send raw text (without newline)
- Send command (append newline)
- Send special keys:
  - Ctrl+C (interrupt)
  - Ctrl+Z (suspend) (optional)
  - Enter
  - Up/Down arrow (optional, v2)

Controls (big buttons for mobile):

- Interrupt (Ctrl+C)
- Send (command)
- Kill session
- Create new pane/window
- Paste mode (send big text; backend must chunk)

### 2.6 “What’s happening” (status view)

For v1, implement **lightweight heuristics** derived from output:

- Detect:
  - “waiting for input” (common prompts: `y/n`, `continue?`, `Press Enter`, agent prompts)
  - test failures (`FAIL`, `ERROR`, `AssertionError`, etc.)
  - completion markers (`Done`, `Finished`, exit status if known)
- Show:
  - last 5 “interesting” lines
  - a short phase label: `BUILDING | TESTING | CODING | IDLE | WAITING | ERROR`
- Later: add structured event markers; not required for v1.

---

## 3) Technical Requirements

### 3.1 OS / environment assumptions

- macOS laptop
- tmux installed and available on PATH
- Node.js LTS installed
- pnpm preferred (or npm acceptable)

### 3.2 Project structure

Monorepo recommended:

repo/
apps/
web/ # React+TS frontend
server/ # Node+TS backend
packages/
shared/ # shared types: API payloads, enums
data/
ccp.sqlite # sqlite db
logs/
<sessionId>/
<paneKey>.log

### 3.3 Backend stack

- TypeScript
- HTTP framework: Fastify (preferred) or Express
- WebSocket: `ws` (preferred)
- SQLite: better-sqlite3 (simple) or Prisma (if agent prefers)
- Log tailing: implement file tailer (fs.watch + read offsets) or use a proven tail lib

### 3.4 Frontend stack

- React + TypeScript (Vite)
- Tailwind for mobile UI
- State: Zustand
- Data: TanStack Query
- No terminal emulator required in v1 (render output in a scrollable code block).
  - If time permits, add xterm.js later; not required.

### 3.5 tmux integration details

#### Naming

- tmux session name: `ccp_<6-10 char>` derived from web session id
- pane key format: `<tmuxSession>:<window>.<pane>`
- log path: `data/logs/<sessionId>/<window>.<pane>.log`

#### Creating a session

Backend command examples:

- Create tmux session detached in workspace path:
  - `tmux new-session -d -s ccp_ab12cd -c /abs/path`
- Set window name (optional):
  - `tmux rename-window -t ccp_ab12cd:0 "main"`
- Pipe pane output to logfile (critical):
  - `tmux pipe-pane -t ccp_ab12cd:0.0 -o 'cat >> "/abs/repo/data/logs/<sessionId>/0.0.log"'`
    - `-o` must ensure it doesn’t overwrite if called twice
- If auto-run template command:
  - send keys:
    - `tmux send-keys -t ccp_ab12cd:0.0 'your command here' Enter`

#### Listing sessions

- `tmux list-sessions -F '#{session_name} #{session_created} #{session_last_attached}'`
- Only sessions matching `ccp_` are “owned” by app; but UI may show all sessions optionally.

#### Listing panes/windows for a session

- `tmux list-windows -t ccp_ab12cd -F '#{window_index} #{window_name}'`
- `tmux list-panes -t ccp_ab12cd:<win> -F '#{pane_index} #{pane_id} #{pane_active} #{pane_current_path}'`

#### Capturing scrollback (resync)

- `tmux capture-pane -t ccp_ab12cd:0.0 -p -S -2000`
  - return last 2000 lines (configurable)

#### Sending input

- Text (no Enter):
  - `tmux send-keys -t ccp_ab12cd:0.0 'text...'`
- Enter:
  - append `Enter`
- Ctrl+C:
  - `tmux send-keys -t ... C-c`

#### Create new pane/window

- New window:
  - `tmux new-window -t ccp_ab12cd -c /abs/path -n "w1"`
- Split pane (optional):
  - `tmux split-window -t ccp_ab12cd:0 -c /abs/path -h` (or -v)

### 3.6 Streaming design

- Primary: tail logfile written by `pipe-pane`.
- Requirements:
  - Maintain per-pane read offset in memory (and optionally persist)
  - Stream appended bytes to connected clients
  - Backpressure: if client is slow, drop old chunks but keep latest tail
- Resync:
  - On WS connect, server sends:
    1. snapshot (capture-pane last N lines)
    2. then begin tail streaming from “now” (or from logfile end)

---

## 4) API Specification

### 4.1 REST endpoints

#### Workspaces

- `GET /api/workspaces`
- `POST /api/workspaces` { name, path, defaultTemplateId? }
- `PUT /api/workspaces/:id`
- `DELETE /api/workspaces/:id`

#### Templates

- `GET /api/templates`
- `POST /api/templates`
- `PUT /api/templates/:id`
- `DELETE /api/templates/:id`

#### Sessions

- `GET /api/sessions`
  - returns both persisted sessions + discovered tmux-owned sessions
- `POST /api/sessions`
  - body: { workspaceId?, templateId?, title?, pathOverride? }
  - creates tmux session; pipes pane; optional autorun
- `GET /api/sessions/:id`
  - details including windows/panes
- `POST /api/sessions/:id/kill`
- `POST /api/sessions/:id/rename` { title }

#### Pane snapshot

- `GET /api/sessions/:id/panes/:paneKey/snapshot?lines=2000`
  - returns capture-pane output as text

### 4.2 WebSocket

- `WS /ws`
  - client subscribes to pane streams + sends input actions

#### WS messages (JSON)

Client -> Server:

- `subscribe`
  - { type: "subscribe", sessionId, paneKey }
- `unsubscribe`
  - { type: "unsubscribe", sessionId, paneKey }
- `input`
  - { type: "input", sessionId, paneKey, data, mode: "raw"|"command" }
- `key`
  - { type: "key", sessionId, paneKey, key: "C-c"|"Enter"|... }
- `resize` (optional v2)
  - { type: "resize", sessionId, paneKey, cols, rows }

Server -> Client:

- `snapshot`
  - { type: "snapshot", sessionId, paneKey, text }
- `output`
  - { type: "output", sessionId, paneKey, chunk }
- `status`
  - { type: "status", sessionId, status, phase?, lastActivityAt }
- `error`
  - { type: "error", message, details? }

---

## 5) UX Requirements (Mobile-first)

### Navigation

- Top-level tabs:
  - Sessions
  - Workspaces
  - Templates
  - Settings

### Sessions screen

- List sessions with:
  - title
  - workspace badge
  - status + phase
  - last activity time
- Actions:
  - open
  - kill (confirm)

### Session detail

- Header: title + status
- Sub-tabs:
  - Status (default)
  - Terminal
  - Panes (optional)
- Status tab:
  - phase label
  - last 20 interesting lines
  - buttons: Interrupt, Send, Kill, New Window
- Terminal tab:
  - scrollable output viewport
  - input bar with send button
  - quick buttons: Ctrl+C, Enter

---

## 6) Security / Networking

Even without auth, must reduce exposure:

- Server binds to:
  - `127.0.0.1` by default
  - configurable to Tailscale IP (preferred) for mobile access
- Add a simple shared token for write operations (recommended):
  - `X-CCP-Token: <random>` stored locally
  - If omitted, allow read-only mode

---

## 7) Reliability / Edge Cases

1. If tmux session exists but app metadata missing:
   - show it as “discovered”
   - allow “adopt” action that creates app record
2. If `pipe-pane` not enabled for a pane:
   - on subscribe, backend ensures piping is configured
3. Log rotation:
   - v1: append indefinitely (acceptable)
   - v2: rotate at size threshold
4. Multiple clients:
   - allow multiple viewers; input should apply to same pane
5. Process exit detection:
   - best-effort: infer idle if no output for N minutes
   - v2: periodically query `#{pane_dead}` / `#{pane_pid}` if needed

---

## 8) Acceptance Criteria (v1)

- Can add a workspace with an absolute path.
- Can create a new session from workspace that opens a tmux session in that path.
- Can auto-run a template command (e.g., codex/claude command).
- Can view live output on mobile browser.
- Can send a command and see its output.
- Can press Interrupt (Ctrl+C) and see command stop.
- Can list multiple sessions and switch between them.
- Works over Tailscale when server binds to Tailscale IP.

---

## 9) Implementation Plan (recommended order)

1. Backend: tmux adapter (create/list/send/capture/kill)
2. Backend: workspace CRUD + SQLite
3. Backend: pipe-pane + logfile tailer + WS output
4. Frontend: Sessions list + Session detail output + input bar
5. Frontend: Workspaces + launch flow
6. Add templates + auto-run
7. Add phase heuristics (regex on output)
8. Harden resync (snapshot + tail)

---

## 10) Developer Notes / Constraints

- All tmux invocations must be robust against shell quoting; prefer spawning with args array where possible.
- Ensure paths and log file locations are safely quoted.
- Do not require elevated privileges.
- Keep dependencies minimal.
- Provide a single `README.md` with:
  - install
  - run locally
  - run bound to Tailscale IP
  - how to stop/cleanup sessions

---

## 11) Open Questions (assume defaults if not answered)

- Default shell: user's login shell (do not hardcode).
- Default snapshot lines: 2000.
- Default log retention: infinite for v1.
- Default server port: 3001.

End of spec.
