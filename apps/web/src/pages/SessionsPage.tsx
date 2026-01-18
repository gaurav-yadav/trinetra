import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessions, useSyncSessions } from '../hooks/useSessions';
import SessionCard from '../components/SessionCard';
import CreateSessionModal from '../components/CreateSessionModal';

export default function SessionsPage() {
  const navigate = useNavigate();
  const { data: sessions, isLoading, refetch, isRefetching } = useSessions();
  const syncSessions = useSyncSessions();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), syncSessions.mutateAsync()]);
  }, [refetch, syncSessions]);

  const sortedSessions = sessions?.sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
  );

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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !sortedSessions?.length ? (
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
        ) : (
          <div className="p-4 space-y-3">
            {sortedSessions.map((session) => (
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
