import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useSessionStore } from '../stores/sessionStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { requestNotificationPermission } from '../utils/notifications';

export default function SettingsPage() {
  const { serverUrl, setServerUrl, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();
  const wsConnected = useSessionStore((s) => s.wsConnected);
  const { connect, disconnect } = useWebSocket();

  const [url, setUrl] = useState(serverUrl);
  const [saved, setSaved] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    setUrl(serverUrl);
  }, [serverUrl]);

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      // Enabling - request permission first
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        setNotificationPermission('granted');
      } else {
        setNotificationPermission(Notification.permission);
      }
    } else {
      // Disabling
      setNotificationsEnabled(false);
    }
  };

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

        {/* Notifications */}
        <section className="card">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-medium text-gray-100">Notifications</h2>
            <p className="text-sm text-gray-500 mt-1">
              Get notified when sessions need attention
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-gray-300">Enable Notifications</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Alerts for: waiting for input, tests failed, done
                </p>
              </div>
              <button
                onClick={handleNotificationToggle}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                aria-label="Toggle notifications"
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {notificationPermission === 'denied' && (
              <p className="text-xs text-red-400">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
            {notificationsEnabled && notificationPermission === 'granted' && (
              <p className="text-xs text-green-400">
                Notifications enabled and permission granted.
              </p>
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
