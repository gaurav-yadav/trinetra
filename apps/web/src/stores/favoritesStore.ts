import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesStore {
  pinnedSessionIds: string[];
  isPinned: (sessionId: string) => boolean;
  togglePin: (sessionId: string) => void;
  pin: (sessionId: string) => void;
  unpin: (sessionId: string) => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      pinnedSessionIds: [],

      isPinned: (sessionId) => get().pinnedSessionIds.includes(sessionId),

      togglePin: (sessionId) => {
        const { pinnedSessionIds } = get();
        if (pinnedSessionIds.includes(sessionId)) {
          set({ pinnedSessionIds: pinnedSessionIds.filter((id) => id !== sessionId) });
        } else {
          set({ pinnedSessionIds: [...pinnedSessionIds, sessionId] });
        }
      },

      pin: (sessionId) => {
        const { pinnedSessionIds } = get();
        if (!pinnedSessionIds.includes(sessionId)) {
          set({ pinnedSessionIds: [...pinnedSessionIds, sessionId] });
        }
      },

      unpin: (sessionId) => {
        const { pinnedSessionIds } = get();
        set({ pinnedSessionIds: pinnedSessionIds.filter((id) => id !== sessionId) });
      },
    }),
    {
      name: 'trinetra-favorites',
    }
  )
);
