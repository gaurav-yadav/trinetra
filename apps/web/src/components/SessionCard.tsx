import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionPhase, type Session } from '@trinetra/shared';
import StatusBadge from './StatusBadge';
import PhaseBadge from './PhaseBadge';
import { useSessionStore } from '../stores/sessionStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useKillSession } from '../hooks/useSessions';
import { toast } from '../utils/toast';

interface SessionCardProps {
  session: Session;
  showPreview?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getLastInterestingLine(content: string | undefined, maxLength = 50): string | null {
  if (!content) return null;

  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return null;

  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.length <= maxLength) return lastLine;

  return lastLine.substring(0, maxLength - 3) + '...';
}

export default function SessionCard({ session, showPreview = true }: SessionCardProps) {
  const navigate = useNavigate();
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const sessionState = useSessionStore((s) => s.sessionStates[session.id]);
  const outputBuffers = useSessionStore((s) => s.outputBuffers);
  const isPinned = useFavoritesStore((s) => s.isPinned(session.id));
  const togglePin = useFavoritesStore((s) => s.togglePin);
  const killSession = useKillSession();

  // Use real-time state if available, fallback to session data
  const status = sessionState?.status || session.status;
  const phase = sessionState?.phase || session.phase;
  const lastActivity = sessionState?.lastActivityAt || session.lastActivityAt;

  // Get preview text from output buffers
  // Try to find output buffer for this session's active pane
  const paneKey = session.activePane || `${session.tmuxSession}:0.0`;
  const outputBuffer = outputBuffers[paneKey];
  const previewText = showPreview ? getLastInterestingLine(outputBuffer?.content) : null;

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(session.id);
  };

  const handleKillClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowKillConfirm(true);
  };

  const handleKillConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    killSession.mutate(session.id, {
      onSuccess: () => {
        toast.success(`Killed "${session.title}"`);
        setShowKillConfirm(false);
      },
      onError: () => {
        toast.error('Failed to kill session');
        setShowKillConfirm(false);
      },
    });
  };

  const handleKillCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowKillConfirm(false);
  };

  const needsAttention = phase === SessionPhase.WAITING || phase === SessionPhase.ERROR;
  const isWaiting = phase === SessionPhase.WAITING;

  return (
    <button
      onClick={() => navigate(`/sessions/${session.id}`)}
      className={`w-full card p-4 text-left active:bg-gray-800 transition-all duration-200 relative ${
        needsAttention
          ? isWaiting
            ? 'border-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
            : 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
          : ''
      }`}
    >
      {/* Attention indicator */}
      {needsAttention && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isWaiting ? 'bg-yellow-400' : 'bg-red-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isWaiting ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-100 truncate">{session.title}</h3>
            {isPinned && (
              <svg
                className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
            {needsAttention && (
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  isWaiting
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {isWaiting ? 'Input needed' : 'Error'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded font-mono">
              {session.tmuxSession}
            </code>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(lastActivity)}
            </span>
          </div>
          {previewText && (
            <p className="text-xs text-gray-500 mt-2 truncate font-mono">
              {previewText}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePinClick}
              className="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
              title={isPinned ? 'Unpin session' : 'Pin session'}
            >
              <svg
                className={`w-4 h-4 ${isPinned ? 'text-yellow-500' : 'text-gray-500'}`}
                fill={isPinned ? 'currentColor' : 'none'}
                viewBox="0 0 20 20"
                stroke="currentColor"
                strokeWidth={isPinned ? 0 : 1.5}
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
            <button
              onClick={handleKillClick}
              className="p-1.5 rounded-full hover:bg-red-900/50 transition-colors"
              title="Kill session"
            >
              <svg
                className="w-4 h-4 text-gray-500 hover:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <StatusBadge status={status} />
          </div>
          {phase && <PhaseBadge phase={phase} />}
        </div>
      </div>

      {/* Kill confirmation overlay */}
      {showKillConfirm && (
        <div className="absolute inset-0 bg-gray-900/95 rounded-lg flex items-center justify-center gap-3 z-10">
          <span className="text-sm text-gray-300">Kill session?</span>
          <button
            onClick={handleKillConfirm}
            disabled={killSession.isPending}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {killSession.isPending ? 'Killing...' : 'Yes'}
          </button>
          <button
            onClick={handleKillCancel}
            disabled={killSession.isPending}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            No
          </button>
        </div>
      )}
    </button>
  );
}
