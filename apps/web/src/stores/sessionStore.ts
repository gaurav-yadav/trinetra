import { create } from 'zustand';
import type { SessionStatus, SessionPhase } from '@trinetra/shared';

interface PaneOutput {
  content: string;
  lastUpdate: number;
}

interface SessionState {
  status: SessionStatus;
  phase?: SessionPhase;
  lastActivityAt: string;
}

interface SessionStore {
  // Active session tracking
  activeSessionId: string | null;
  activePaneKey: string | null;
  setActiveSession: (sessionId: string | null, paneKey?: string | null) => void;

  // Output buffers per pane
  outputBuffers: Record<string, PaneOutput>;
  setSnapshot: (paneKey: string, text: string) => void;
  appendOutput: (paneKey: string, chunk: string) => void;
  clearOutput: (paneKey: string) => void;

  // Session status cache (updated via WebSocket)
  sessionStates: Record<string, SessionState>;
  updateSessionState: (
    sessionId: string,
    status: SessionStatus,
    phase?: SessionPhase,
    lastActivityAt?: string
  ) => void;

  // WebSocket connection state
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  // Active session
  activeSessionId: null,
  activePaneKey: null,
  setActiveSession: (sessionId, paneKey = null) =>
    set({ activeSessionId: sessionId, activePaneKey: paneKey }),

  // Output buffers
  outputBuffers: {},

  // setSnapshot replaces the entire content (used for capture-pane polling)
  setSnapshot: (paneKey, text) =>
    set((state) => ({
      outputBuffers: {
        ...state.outputBuffers,
        [paneKey]: { content: text, lastUpdate: Date.now() },
      },
    })),

  // appendOutput also replaces now since we're using polling
  appendOutput: (paneKey, chunk) =>
    set((state) => ({
      outputBuffers: {
        ...state.outputBuffers,
        [paneKey]: { content: chunk, lastUpdate: Date.now() },
      },
    })),

  clearOutput: (paneKey) =>
    set((state) => {
      const { [paneKey]: _, ...rest } = state.outputBuffers;
      return { outputBuffers: rest };
    }),

  // Session states
  sessionStates: {},
  updateSessionState: (sessionId, status, phase, lastActivityAt) =>
    set((state) => ({
      sessionStates: {
        ...state.sessionStates,
        [sessionId]: {
          status,
          phase,
          lastActivityAt: lastActivityAt || new Date().toISOString(),
        },
      },
    })),

  // WebSocket
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),
}));
