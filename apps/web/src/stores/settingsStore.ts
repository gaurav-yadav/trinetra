import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
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
    }),
    {
      name: 'trinetra-settings',
    }
  )
);
