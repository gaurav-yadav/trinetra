import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  serverUrl: string;
  setServerUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      serverUrl: '',
      setServerUrl: (url) => {
        localStorage.setItem('trinetra-server-url', url);
        set({ serverUrl: url });
      },
    }),
    {
      name: 'trinetra-settings',
    }
  )
);
