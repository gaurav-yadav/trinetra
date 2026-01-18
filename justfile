# Trinetra Development Commands
# =============================
# Run `just` or `just --list` to see all available commands.
# New contributors: run `just dev` to start the full stack.

# Default recipe - show available commands
default:
    @just --list

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------

# Start the full development stack (server + web)
dev:
    @echo "Starting Trinetra development servers..."
    @echo ""
    @echo "  Server API:  http://localhost:3001"
    @echo "  Web UI:      http://localhost:5173"
    @echo ""
    pnpm dev

# Start only the backend server
dev-server:
    @echo "Starting server at http://localhost:3001"
    pnpm dev:server

# Start only the web frontend
dev-web:
    @echo "Starting web UI at http://localhost:5173"
    pnpm dev:web

# ---------------------------------------------------------------------------
# Build & Quality
# ---------------------------------------------------------------------------

# Run TypeScript type checking across all packages
typecheck:
    pnpm typecheck

# Build all packages for production
build:
    pnpm build

# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------

# Remove build artifacts, data, logs, and caches
clean:
    pnpm clean

# Full reset: clean everything and reinstall dependencies
reset: clean
    pnpm install
