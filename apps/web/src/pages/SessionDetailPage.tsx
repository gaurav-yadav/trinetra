import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { InputMode, SessionPhase, type KeyMessage } from '@trinetra/shared';
import { useSession, useKillSession } from '../hooks/useSessions';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSessionStore } from '../stores/sessionStore';
import { stripAnsi } from '../utils/ansi';
import StatusBadge from '../components/StatusBadge';
import PhaseBadge from '../components/PhaseBadge';
import OutputView from '../components/OutputView';
import Modal from '../components/Modal';

interface PaneOption {
  key: string; // Full pane key e.g., "session:0.0"
  paneTarget: string; // Just the window.pane part e.g., "0.0"
  label: string; // e.g., "Window 0: Pane 0"
  windowIndex: number;
  paneIndex: number;
  windowName: string;
  isActive: boolean;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: session, isLoading } = useSession(id!);
  const killSession = useKillSession();

  const { subscribe, unsubscribe, sendInput, sendKey, isConnected } = useWebSocket();
  const { outputBuffers, sessionStates, setActiveSession } = useSessionStore();

  // Build list of available panes from session windows
  const paneOptions = useMemo((): PaneOption[] => {
    if (!session?.windows) return [];

    const options: PaneOption[] = [];
    for (const window of session.windows) {
      for (const pane of window.panes) {
        const paneTarget = `${window.index}.${pane.index}`;
        options.push({
          key: `${session.tmuxSession}:${paneTarget}`,
          paneTarget,
          label: session.windows.length === 1 && window.panes.length === 1
            ? `Pane ${pane.index}`
            : session.windows.length === 1
            ? `Pane ${pane.index}`
            : `${window.name || `Window ${window.index}`}: Pane ${pane.index}`,
          windowIndex: window.index,
          paneIndex: pane.index,
          windowName: window.name || `Window ${window.index}`,
          isActive: pane.active,
        });
      }
    }
    return options;
  }, [session]);

  // Support ?pane=0.0 query param for deep linking to specific panes
  const paneParam = searchParams.get('pane');

  // Determine current pane key
  const paneKey = useMemo(() => {
    if (!session) return null;

    // If pane query param is provided (e.g., ?pane=0.0), use it
    if (paneParam) {
      // Validate that the pane exists in paneOptions
      const exists = paneOptions.some(p => p.paneTarget === paneParam);
      if (exists) {
        return `${session.tmuxSession}:${paneParam}`;
      }
    }

    // Try to use activePane from session
    if (session.activePane) return session.activePane;

    // Fall back to first pane or default
    if (paneOptions.length > 0) {
      return paneOptions[0].key;
    }

    return `${session.tmuxSession}:0.0`;
  }, [session, paneParam, paneOptions]);

  // Get current pane target for URL
  const currentPaneTarget = useMemo(() => {
    if (!paneKey || !session) return null;
    // Extract the pane target from the key (e.g., "session:0.0" -> "0.0")
    const prefix = `${session.tmuxSession}:`;
    if (paneKey.startsWith(prefix)) {
      return paneKey.slice(prefix.length);
    }
    return null;
  }, [paneKey, session]);

  // Handle pane switching
  const handlePaneSwitch = useCallback((paneTarget: string) => {
    setSearchParams({ pane: paneTarget });
  }, [setSearchParams]);

  useEffect(() => {
    if (id && paneKey && isConnected) {
      setActiveSession(id, paneKey);
      subscribe(id, paneKey);
      return () => {
        unsubscribe(id, paneKey);
        setActiveSession(null, null);
      };
    }
  }, [id, paneKey, isConnected, subscribe, unsubscribe, setActiveSession]);

  const sessionState = sessionStates[id!];
  const status = sessionState?.status || session?.status;
  const phase = sessionState?.phase || session?.phase;
  const rawOutput = paneKey ? outputBuffers[paneKey]?.content || '' : '';
  const output = useMemo(() => stripAnsi(rawOutput), [rawOutput]);

  const handleCopyCommand = () => {
    if (session) {
      navigator.clipboard.writeText(`tmux attach -t ${session.tmuxSession}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKill = async () => {
    if (id) {
      await killSession.mutateAsync(id);
      navigate('/sessions');
    }
  };

  const handleSendCommand = () => {
    if (commandInput.trim() && id && paneKey) {
      sendInput(id, paneKey, commandInput, InputMode.COMMAND);
      setCommandInput('');
    }
  };

  const handleKey = (key: string) => {
    if (id && paneKey) {
      sendKey(id, paneKey, key as KeyMessage['key']);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
        <p>Session not found</p>
        <button onClick={() => navigate('/sessions')} className="btn-primary mt-4">
          Back
        </button>
      </div>
    );
  }

  const needsAttention = phase === SessionPhase.WAITING || phase === SessionPhase.ERROR;
  const isWaiting = phase === SessionPhase.WAITING;
  const isError = phase === SessionPhase.ERROR;

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Needs Attention Banner */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          needsAttention ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div
          className={`px-3 py-2 border-b ${
            isWaiting
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isWaiting ? (
                <svg className="w-4 h-4 text-yellow-400 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span className={`text-sm font-medium truncate ${isWaiting ? 'text-yellow-300' : 'text-red-300'}`}>
                {isWaiting ? 'Waiting for input' : 'Error occurred'}
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => handleKey('y')}
                className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded"
              >
                y
              </button>
              <button
                onClick={() => handleKey('n')}
                className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded"
              >
                n
              </button>
              <button
                onClick={() => handleKey('Enter')}
                className="px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded"
              >
                Enter
              </button>
              <button
                onClick={() => handleKey('C-c')}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded"
              >
                Ctrl+C
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Header */}
      <header className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800">
        <button onClick={() => navigate('/sessions')} className="p-1.5 -ml-1 rounded hover:bg-gray-800">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-100 truncate text-sm">{session.title}</span>
            {phase && <PhaseBadge phase={phase} size="sm" />}
          </div>
          <button
            onClick={handleCopyCommand}
            className="text-xs text-gray-500 hover:text-gray-300 font-mono flex items-center gap-1 mt-0.5"
          >
            {session.tmuxSession}
            {copied ? (
              <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {status && <StatusBadge status={status} />}
      </header>

      {/* Pane Switcher - only show when multiple panes exist */}
      {paneOptions.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-900/50 border-b border-gray-800 overflow-x-auto">
          <span className="text-xs text-gray-500 mr-1 shrink-0">Panes:</span>
          {paneOptions.map((pane) => (
            <button
              key={pane.key}
              onClick={() => handlePaneSwitch(pane.paneTarget)}
              className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 transition-colors ${
                currentPaneTarget === pane.paneTarget
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {pane.label}
              {pane.isActive && (
                <span className="ml-1 w-1.5 h-1.5 bg-green-400 rounded-full inline-block" title="Active pane" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Full-height Terminal Output */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <OutputView content={output} sessionTitle={session.title} />
      </div>

      {/* Compact Input Bar */}
      <div className="bg-gray-900 border-t border-gray-800">
        {/* Quick Keys Row */}
        <div className="flex gap-1 px-2 py-1.5 border-b border-gray-800 overflow-x-auto">
          <button
            onClick={() => handleKey('C-c')}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded shrink-0"
          >
            Ctrl+C
          </button>
          <button
            onClick={() => handleKey('Enter')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            Enter
          </button>
          <button
            onClick={() => handleKey('Escape')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            Esc
          </button>
          <button
            onClick={() => handleKey('y')}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded shrink-0"
          >
            y
          </button>
          <button
            onClick={() => handleKey('n')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            n
          </button>
          <button
            onClick={() => handleKey('1')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            1
          </button>
          <button
            onClick={() => handleKey('2')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            2
          </button>
          <button
            onClick={() => handleKey('3')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            3
          </button>
          <button
            onClick={() => handleKey('Up')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            ↑
          </button>
          <button
            onClick={() => handleKey('Down')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded shrink-0"
          >
            ↓
          </button>
          <button
            onClick={() => setShowActions(true)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium rounded shrink-0"
          >
            •••
          </button>
        </div>

        {/* Command Input */}
        <div className="flex gap-2 p-2">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendCommand();
              }
            }}
            placeholder="Command..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSendCommand}
            disabled={!commandInput.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-medium rounded"
          >
            Send
          </button>
        </div>
      </div>

      {/* Actions Modal */}
      <Modal isOpen={showActions} onClose={() => setShowActions(false)} title="Actions">
        <div className="space-y-2">
          <button
            onClick={() => {
              handleKey('Tab');
              setShowActions(false);
            }}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded text-left px-4"
          >
            Tab
          </button>
          <button
            onClick={() => {
              handleKey('Space');
              setShowActions(false);
            }}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded text-left px-4"
          >
            Space
          </button>
          <button
            onClick={() => {
              handleKey('C-z');
              setShowActions(false);
            }}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded text-left px-4"
          >
            Ctrl+Z (Suspend)
          </button>
          <div className="border-t border-gray-700 my-2" />
          <button
            onClick={() => {
              setShowActions(false);
              setShowKillConfirm(true);
            }}
            className="w-full py-3 bg-red-900/50 hover:bg-red-900 text-red-400 rounded text-left px-4"
          >
            Kill Session
          </button>
        </div>
      </Modal>

      {/* Kill Confirmation Modal */}
      <Modal isOpen={showKillConfirm} onClose={() => setShowKillConfirm(false)} title="Kill Session">
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            Kill this session? All processes will be terminated.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowKillConfirm(false)}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleKill}
              disabled={killSession.isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              {killSession.isPending ? 'Killing...' : 'Kill'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
