import { useCallback, useRef, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { InputMode } from '@trinetra/shared';
import type {
  ClientMessage,
  ServerMessage,
  KeyMessage,
  SessionPhase,
} from '@trinetra/shared';
import { notifyPhaseChange } from '../utils/notifications';

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

// Singleton WebSocket instance
let wsInstance: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

// Track previous phases to detect changes for notifications
const previousPhases: Record<string, SessionPhase | undefined> = {};

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const {
    setWsConnected,
    setSnapshot,
    appendOutput,
    updateSessionState,
  } = useSessionStore();

  const getWsUrl = useCallback(() => {
    const stored = localStorage.getItem('trinetra-server-url');
    if (stored) {
      // Convert http(s) to ws(s)
      const url = new URL(stored);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/ws';
      return url.toString();
    }
    // Default to current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'snapshot':
            setSnapshot(message.paneKey, message.text);
            break;

          case 'output':
            appendOutput(message.paneKey, message.chunk);
            break;

          case 'status':
            // Check for phase change and notify
            if (message.phase && message.phase !== previousPhases[message.sessionId]) {
              // Get session title from store or use session ID
              const sessionState = useSessionStore.getState().sessionStates[message.sessionId];
              const title = sessionState?.status ? `Session ${message.sessionId.slice(0, 8)}` : message.sessionId.slice(0, 8);
              notifyPhaseChange(message.sessionId, title, message.phase);
              previousPhases[message.sessionId] = message.phase;
            }
            updateSessionState(
              message.sessionId,
              message.status,
              message.phase,
              message.lastActivityAt
            );
            break;

          case 'error':
            console.error('WebSocket error:', message.message, message.details);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    },
    [setSnapshot, appendOutput, updateSessionState]
  );

  const connect = useCallback(() => {
    // If already connected, return existing instance
    if (wsInstance?.readyState === WebSocket.OPEN) {
      wsRef.current = wsInstance;
      return;
    }

    // If connecting, wait
    if (wsInstance?.readyState === WebSocket.CONNECTING) {
      wsRef.current = wsInstance;
      return;
    }

    // Clean up existing connection
    if (wsInstance) {
      wsInstance.close();
      wsInstance = null;
    }

    const url = getWsUrl();
    console.log('Connecting to WebSocket:', url);

    try {
      const ws = new WebSocket(url);
      wsInstance = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        reconnectAttempts = 0;
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        wsInstance = null;

        // Auto-reconnect with backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
          reconnectAttempts++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          reconnectTimeout = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onmessage = handleMessage;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [getWsUrl, setWsConnected, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect

    if (wsInstance) {
      wsInstance.close();
      wsInstance = null;
    }
    setWsConnected(false);
  }, [setWsConnected]);

  const send = useCallback((message: ClientMessage) => {
    if (wsInstance?.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  const subscribe = useCallback(
    (sessionId: string, paneKey: string) => {
      send({
        type: 'subscribe',
        sessionId,
        paneKey,
      });
    },
    [send]
  );

  const unsubscribe = useCallback(
    (sessionId: string, paneKey: string) => {
      send({
        type: 'unsubscribe',
        sessionId,
        paneKey,
      });
    },
    [send]
  );

  const sendInput = useCallback(
    (sessionId: string, paneKey: string, data: string, mode: InputMode = InputMode.COMMAND) => {
      send({
        type: 'input',
        sessionId,
        paneKey,
        data,
        mode,
      });
    },
    [send]
  );

  const sendKey = useCallback(
    (
      sessionId: string,
      paneKey: string,
      key: KeyMessage['key']
    ) => {
      send({
        type: 'key',
        sessionId,
        paneKey,
        key,
      });
    },
    [send]
  );

  const sendResize = useCallback(
    (sessionId: string, paneKey: string, cols: number, rows: number) => {
      send({
        type: 'resize',
        sessionId,
        paneKey,
        cols,
        rows,
      });
    },
    [send]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendInput,
    sendKey,
    sendResize,
    isConnected: useSessionStore((s) => s.wsConnected),
  };
}
