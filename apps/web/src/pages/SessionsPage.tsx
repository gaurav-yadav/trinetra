import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionPhase, type Session } from '@trinetra/shared';
import { useSessions } from '../hooks/useSessions';
import SessionCard from '../components/SessionCard';
import CreateSessionModal from '../components/CreateSessionModal';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useSessionStore } from '../stores/sessionStore';

type PhaseFilter = 'ALL' | SessionPhase;

const PHASE_FILTERS: { value: PhaseFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: SessionPhase.WAITING, label: 'Waiting' },
  { value: SessionPhase.ERROR, label: 'Error' },
  { value: SessionPhase.BUILDING, label: 'Building' },
  { value: SessionPhase.TESTING, label: 'Testing' },
  { value: SessionPhase.CODING, label: 'Coding' },
  { value: SessionPhase.IDLE, label: 'Idle' },
];

// Priority order for phases (WAITING and ERROR first)
const PHASE_PRIORITY: Record<SessionPhase, number> = {
  [SessionPhase.WAITING]: 0,
  [SessionPhase.ERROR]: 1,
  [SessionPhase.BUILDING]: 2,
  [SessionPhase.TESTING]: 3,
  [SessionPhase.CODING]: 4,
  [SessionPhase.IDLE]: 5,
};

export default function SessionsPage() {
  const navigate = useNavigate();
  const { data: sessions, isLoading, refetch, isRefetching } = useSessions();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('ALL');

  const pinnedSessionIds = useFavoritesStore((s) => s.pinnedSessionIds);
  const sessionStates = useSessionStore((s) => s.sessionStates);

  // Pull to refresh handler
  // Note: sync is handled automatically by GET /api/sessions which merges DB + discovered tmux sessions
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Get the real-time phase for a session (from store if available, otherwise from session data)
  const getSessionPhase = useCallback(
    (session: Session): SessionPhase | undefined => {
      return sessionStates[session.id]?.phase || session.phase;
    },
    [sessionStates]
  );

  // Filter and sort sessions
  const filteredAndSortedSessions = useMemo(() => {
    if (!sessions) return [];

    // Filter by search query
    let filtered = sessions.filter((session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by phase
    if (phaseFilter !== 'ALL') {
      filtered = filtered.filter((session) => {
        const phase = getSessionPhase(session);
        return phase === phaseFilter;
      });
    }

    // Sort: pinned first, then by phase priority (WAITING/ERROR first), then by lastActivityAt
    return filtered.sort((a, b) => {
      // Pinned sessions first
      const aPinned = pinnedSessionIds.includes(a.id);
      const bPinned = pinnedSessionIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Within same pin status, sort by phase priority
      const aPhase = getSessionPhase(a);
      const bPhase = getSessionPhase(b);
      const aPriority = aPhase ? PHASE_PRIORITY[aPhase] : 6;
      const bPriority = bPhase ? PHASE_PRIORITY[bPhase] : 6;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Finally, sort by last activity (most recent first)
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }, [sessions, searchQuery, phaseFilter, pinnedSessionIds, getSessionPhase]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-gray-100">Sessions</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefetching}
          className="btn-ghost p-2"
        >
          <svg
            className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </header>

      {/* Search and Filters */}
      <div className="px-4 pt-4 pb-2 space-y-3 border-b border-gray-800">
        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Phase Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {PHASE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setPhaseFilter(filter.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                phaseFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !sessions?.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p>No sessions yet</p>
            <p className="text-sm mt-1">Tap + to create one</p>
          </div>
        ) : !filteredAndSortedSessions.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p>No matching sessions</p>
            <p className="text-sm mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredAndSortedSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed right-4 bottom-20 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-blue-700"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(id) => navigate(`/sessions/${id}`)}
      />
    </div>
  );
}
