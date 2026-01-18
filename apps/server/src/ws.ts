// WebSocket Handler - Using capture-pane polling for 1:1 terminal mirroring

import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { v4 as uuidv4 } from 'uuid';
import {
  getSessionById,
  getSessionByTmuxSession,
  updateSessionActivity,
  updateSessionStatus,
} from './db.js';
import * as tmux from './tmux.js';
import { detectPhase } from './phase-detector.js';
import {
  InputMode,
  SessionStatus,
  type ClientMessage,
  type ServerMessage,
  type SubscribeMessage,
  type UnsubscribeMessage,
  type InputMessage,
  type KeyMessage,
} from '@trinetra/shared';

interface Subscription {
  sessionId: string;
  paneKey: string;
  tmuxTarget: string;
  intervalId: ReturnType<typeof setInterval>;
  lastContent: string;
}

interface ConnectionState {
  id: string;
  socket: WebSocket;
  subscriptions: Map<string, Subscription>;
}

const connections = new Map<string, ConnectionState>();
const POLL_INTERVAL_MS = 1000; // Poll every 1 second

function sendMessage(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(message));
  }
}

export function setupWebSocket(fastify: FastifyInstance, _dataDir: string): void {
  fastify.get('/ws', { websocket: true }, (socket, _request) => {
    const connectionId = uuidv4();
    const state: ConnectionState = {
      id: connectionId,
      socket,
      subscriptions: new Map(),
    };
    connections.set(connectionId, state);

    fastify.log.info(`WebSocket connected: ${connectionId}`);

    socket.on('message', async (rawData) => {
      try {
        const message = JSON.parse(rawData.toString()) as ClientMessage;
        await handleMessage(fastify, state, message);
      } catch (error) {
        fastify.log.error({ err: error }, 'WebSocket message error');
        sendMessage(socket, {
          type: 'error',
          message: 'Invalid message format',
          details: String(error),
        });
      }
    });

    socket.on('close', () => {
      fastify.log.info(`WebSocket disconnected: ${connectionId}`);
      // Stop all polling intervals
      for (const sub of state.subscriptions.values()) {
        clearInterval(sub.intervalId);
      }
      connections.delete(connectionId);
    });

    socket.on('error', (error) => {
      fastify.log.error({ err: error, connectionId }, 'WebSocket error');
    });
  });
}

async function handleMessage(
  fastify: FastifyInstance,
  state: ConnectionState,
  message: ClientMessage
): Promise<void> {
  switch (message.type) {
    case 'subscribe':
      await handleSubscribe(fastify, state, message);
      break;
    case 'unsubscribe':
      handleUnsubscribe(state, message);
      break;
    case 'input':
      await handleInput(fastify, state, message);
      break;
    case 'key':
      await handleKey(fastify, state, message);
      break;
    case 'resize':
      break;
    default:
      sendMessage(state.socket, {
        type: 'error',
        message: 'Unknown message type',
      });
  }
}

async function handleSubscribe(
  fastify: FastifyInstance,
  state: ConnectionState,
  message: SubscribeMessage
): Promise<void> {
  const { sessionId, paneKey } = message;
  const subKey = `${sessionId}:${paneKey}`;

  // Already subscribed?
  if (state.subscriptions.has(subKey)) {
    return;
  }

  // Get session info
  let session = getSessionById(sessionId);
  if (!session) {
    session = getSessionByTmuxSession(sessionId);
  }

  const tmuxSessionName = session?.tmuxSession ?? sessionId;
  const tmuxTarget = `${tmuxSessionName}:${paneKey}`;

  // Send initial snapshot
  try {
    const snapshot = await tmux.capturePane(tmuxTarget, 500);
    sendMessage(state.socket, {
      type: 'snapshot',
      sessionId,
      paneKey,
      text: snapshot,
    });

    // Detect phase
    const phase = detectPhase(snapshot);
    if (session) {
      updateSessionStatus(session.id, session.status, phase);
    }
    sendMessage(state.socket, {
      type: 'status',
      sessionId,
      status: session?.status ?? SessionStatus.RUNNING,
      phase,
      lastActivityAt: new Date().toISOString(),
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to capture pane');
    sendMessage(state.socket, {
      type: 'error',
      message: 'Failed to capture pane',
      details: String(error),
    });
    return;
  }

  // Start polling interval
  const intervalId = setInterval(async () => {
    try {
      const content = await tmux.capturePane(tmuxTarget, 500);
      const sub = state.subscriptions.get(subKey);

      // Only send if content changed
      if (sub && content !== sub.lastContent) {
        sub.lastContent = content;

        sendMessage(state.socket, {
          type: 'snapshot',
          sessionId,
          paneKey,
          text: content,
        });

        // Update phase
        const phase = detectPhase(content);
        const currentSession = getSessionById(sessionId);
        if (currentSession) {
          updateSessionStatus(currentSession.id, currentSession.status, phase);
          updateSessionActivity(currentSession.id);
        }
        sendMessage(state.socket, {
          type: 'status',
          sessionId,
          status: currentSession?.status ?? SessionStatus.RUNNING,
          phase,
          lastActivityAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Session might have been killed, stop polling
      const sub = state.subscriptions.get(subKey);
      if (sub) {
        clearInterval(sub.intervalId);
        state.subscriptions.delete(subKey);
      }
    }
  }, POLL_INTERVAL_MS);

  // Track subscription
  state.subscriptions.set(subKey, {
    sessionId,
    paneKey,
    tmuxTarget,
    intervalId,
    lastContent: '',
  });
}

function handleUnsubscribe(state: ConnectionState, message: UnsubscribeMessage): void {
  const { sessionId, paneKey } = message;
  const subKey = `${sessionId}:${paneKey}`;

  const sub = state.subscriptions.get(subKey);
  if (sub) {
    clearInterval(sub.intervalId);
    state.subscriptions.delete(subKey);
  }
}

async function handleInput(
  fastify: FastifyInstance,
  state: ConnectionState,
  message: InputMessage
): Promise<void> {
  const { sessionId, paneKey, data, mode } = message;

  let session = getSessionById(sessionId);
  if (!session) {
    session = getSessionByTmuxSession(sessionId);
  }

  const tmuxSessionName = session?.tmuxSession ?? sessionId;
  const target = `${tmuxSessionName}:${paneKey}`;

  try {
    if (mode === InputMode.COMMAND) {
      await tmux.sendCommand(target, data);
    } else {
      await tmux.sendKeys(target, data);
    }

    if (session) {
      updateSessionActivity(session.id);
    }
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to send input');
    sendMessage(state.socket, {
      type: 'error',
      message: 'Failed to send input',
      details: String(error),
    });
  }
}

async function handleKey(
  fastify: FastifyInstance,
  state: ConnectionState,
  message: KeyMessage
): Promise<void> {
  const { sessionId, paneKey, key } = message;

  let session = getSessionById(sessionId);
  if (!session) {
    session = getSessionByTmuxSession(sessionId);
  }

  const tmuxSessionName = session?.tmuxSession ?? sessionId;
  const target = `${tmuxSessionName}:${paneKey}`;

  try {
    const keyMap: Record<string, string> = {
      'C-c': 'C-c',
      'C-z': 'C-z',
      Enter: 'Enter',
      Escape: 'Escape',
      Up: 'Up',
      Down: 'Down',
      Left: 'Left',
      Right: 'Right',
      Tab: 'Tab',
      Space: 'Space',
      '1': '1',
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      y: 'y',
      n: 'n',
    };

    const tmuxKey = keyMap[key] || key;
    await tmux.sendKeys(target, tmuxKey);

    if (session) {
      updateSessionActivity(session.id);
    }
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to send key');
    sendMessage(state.socket, {
      type: 'error',
      message: 'Failed to send key',
      details: String(error),
    });
  }
}
