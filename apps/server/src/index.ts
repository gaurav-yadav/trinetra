// Trinetra Server - Main Entry Point

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

import { initDb, closeDb } from './db.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { templateRoutes } from './routes/templates.js';
import { createSessionRoutes } from './routes/sessions.js';
import { setupWebSocket } from './ws.js';
import { checkTmux } from './tmux.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Configuration
const HOST = process.env.TRINETRA_HOST || '127.0.0.1';
const PORT = parseInt(process.env.TRINETRA_PORT || '3001', 10);
const DATA_DIR = path.resolve(REPO_ROOT, process.env.TRINETRA_DATA_DIR || './data');

async function main() {
  // Check tmux availability
  const tmuxAvailable = await checkTmux();
  if (!tmuxAvailable) {
    console.error('ERROR: tmux is not available. Please install tmux first.');
    process.exit(1);
  }

  // Ensure data directories exist
  const logsDir = path.join(DATA_DIR, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Initialize database
  console.log(`Initializing database at ${DATA_DIR}/ccp.sqlite`);
  await initDb(DATA_DIR);

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Register WebSocket
  await fastify.register(websocket);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register REST API routes under /api prefix
  await fastify.register(
    async (api) => {
      await api.register(workspaceRoutes);
      await api.register(templateRoutes);
      await api.register(createSessionRoutes(DATA_DIR));
    },
    { prefix: '/api' }
  );

  // Setup WebSocket handler
  setupWebSocket(fastify, DATA_DIR);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await fastify.close();
    closeDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  try {
    await fastify.listen({ host: HOST, port: PORT });
    console.log(`\nTrinetra server running at http://${HOST}:${PORT}`);
    console.log(`WebSocket available at ws://${HOST}:${PORT}/ws`);
    console.log(`\nAPI endpoints:`);
    console.log(`  GET    /health`);
    console.log(`  GET    /api/workspaces`);
    console.log(`  POST   /api/workspaces`);
    console.log(`  PUT    /api/workspaces/:id`);
    console.log(`  DELETE /api/workspaces/:id`);
    console.log(`  GET    /api/templates`);
    console.log(`  POST   /api/templates`);
    console.log(`  PUT    /api/templates/:id`);
    console.log(`  DELETE /api/templates/:id`);
    console.log(`  GET    /api/sessions`);
    console.log(`  POST   /api/sessions`);
    console.log(`  GET    /api/sessions/:id`);
    console.log(`  POST   /api/sessions/:id/kill`);
    console.log(`  POST   /api/sessions/:id/rename`);
    console.log(`  GET    /api/sessions/:id/panes/:paneKey/snapshot`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
