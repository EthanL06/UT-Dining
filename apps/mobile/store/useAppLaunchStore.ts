import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { RatingPromptRecord } from '~/utils/ratingPrompt';

import { zustandStorage } from './rnmmkv-storage';

interface AppLaunchState {
  launchCount: number;
  firstLaunchTimestamp: number | null;
  lastRatingPrompt: RatingPromptRecord | null;

  incrementLaunchCount: () => void;
  markRatingPromptShown: (version: string) => void;
  resetRatingPrompt: () => void;
}

type PersistedV0 = {
  launchCount?: number;
  firstLaunchTimestamp?: number | null;
  hasShownRatingPrompt?: boolean;
};

export const useAppLaunchStore = create<AppLaunchState>()(
  persist(
    (set, get) => ({
      launchCount: 0,
      firstLaunchTimestamp: null,
      lastRatingPrompt: null,

      incrementLaunchCount: () => {
        const state = get();
        set({
          launchCount: state.launchCount + 1,
          firstLaunchTimestamp: state.firstLaunchTimestamp ?? Date.now(),
        });
      },

      markRatingPromptShown: (version) => {
        set({ lastRatingPrompt: { version, at: Date.now() } });
      },

      resetRatingPrompt: () => {
        set({
          launchCount: 0,
          firstLaunchTimestamp: null,
          lastRatingPrompt: null,
        });
      },
    }),
    {
      name: 'app-launch-storage',
      version: 1,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        launchCount: state.launchCount,
        firstLaunchTimestamp: state.firstLaunchTimestamp,
        lastRatingPrompt: state.lastRatingPrompt,
      }),
      migrate: (persisted, version) => {
        if (version >= 1) return persisted as Partial<AppLaunchState>;
        const old = (persisted ?? {}) as PersistedV0;
        return {
          launchCount: old.launchCount ?? 0,
          firstLaunchTimestamp: old.firstLaunchTimestamp ?? null,
          lastRatingPrompt: old.hasShownRatingPrompt ? { version: 'legacy', at: Date.now() } : null,
        };
      },
    },
  ),
);
