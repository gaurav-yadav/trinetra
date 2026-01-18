import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TerminalRenderer = 'simple' | 'xterm';

interface SettingsStore {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  terminalRenderer: TerminalRenderer;
  setTerminalRenderer: (renderer: TerminalRenderer) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      serverUrl: '',
      setServerUrl: (url) => {
        localStorage.setItem('trinetra-server-url', url);
        set({ serverUrl: url });
      },
      notificationsEnabled: false,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      terminalRenderer: 'simple',
      setTerminalRenderer: (renderer) => set({ terminalRenderer: renderer }),
    }),
    {
      name: 'trinetra-settings',
    }
  )
);
