import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './components/BottomNav';
import SessionsPage from './pages/SessionsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import WorkspacesPage from './pages/WorkspacesPage';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const { connect } = useWebSocket();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <main className="flex-1 overflow-hidden pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/sessions" replace />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
