import { useNavigate } from 'react-router-dom';
import type { Session } from '@trinetra/shared';
import StatusBadge from './StatusBadge';
import PhaseBadge from './PhaseBadge';
import { useSessionStore } from '../stores/sessionStore';

interface SessionCardProps {
  session: Session;
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

export default function SessionCard({ session }: SessionCardProps) {
  const navigate = useNavigate();
  const sessionState = useSessionStore((s) => s.sessionStates[session.id]);

  // Use real-time state if available, fallback to session data
  const status = sessionState?.status || session.status;
  const phase = sessionState?.phase || session.phase;
  const lastActivity = sessionState?.lastActivityAt || session.lastActivityAt;

  return (
    <button
      onClick={() => navigate(`/sessions/${session.id}`)}
      className="w-full card p-4 text-left active:bg-gray-800 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-100 truncate">{session.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded font-mono">
              {session.tmuxSession}
            </code>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(lastActivity)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={status} />
          {phase && <PhaseBadge phase={phase} />}
        </div>
      </div>
    </button>
  );
}
