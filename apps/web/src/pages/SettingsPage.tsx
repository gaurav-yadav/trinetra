import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useSessionStore } from '../stores/sessionStore';
import { useWebSocket } from '../hooks/useWebSocket';

export default function SettingsPage() {
  const { serverUrl, setServerUrl } = useSettingsStore();
  const wsConnected = useSessionStore((s) => s.wsConnected);
  const { connect, disconnect } = useWebSocket();

  const [url, setUrl] = useState(serverUrl);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUrl(serverUrl);
  }, [serverUrl]);

  const handleSave = () => {
    setServerUrl(url);
    setSaved(true);
    // Reconnect with new URL
    disconnect();
    setTimeout(() => connect(), 100);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setUrl('');
    setServerUrl('');
    disconnect();
    setTimeout(() => connect(), 100);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-gray-100">Settings</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Server Configuration */}
        <section className="card">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-medium text-gray-100">Server Connection</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure the Trinetra server URL for remote access (e.g., via Tailscale)
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="serverUrl" className="label">
                Server URL
              </label>
              <input
                id="serverUrl"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3001 (default)"
                className="input font-mono text-sm"
              />
              <p className="text-xs text-gray-600 mt-1">
                Leave empty to use the default local server
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClear}
                disabled={!url}
                className="btn-secondary flex-1"
              >
                Clear
              </button>
              <button onClick={handleSave} className="btn-primary flex-1">
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </section>

        {/* Connection Status */}
        <section className="card">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-medium text-gray-100">Connection Status</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  wsConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-gray-300">
                WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {!wsConnected && (
              <button onClick={connect} className="btn-primary mt-4 w-full">
                Reconnect
              </button>
            )}
          </div>
        </section>

        {/* About */}
        <section className="card">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-medium text-gray-100">About</h2>
          </div>
          <div className="p-4 space-y-3 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Trinetra</span>
              <span className="text-gray-500">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Remote tmux session manager</span>
            </div>
            <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
              Monitor and control your tmux sessions from anywhere. Perfect for
              long-running tasks, CI/CD pipelines, and remote development.
            </p>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="card border-red-900/50">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-medium text-red-400">Danger Zone</h2>
          </div>
          <div className="p-4">
            <button
              onClick={() => {
                if (confirm('Clear all local data? This cannot be undone.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="btn-danger w-full"
            >
              Clear All Local Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
