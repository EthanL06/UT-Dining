import type { MenuDayVersions } from '@ut-dining/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from './rnmmkv-storage';

interface DataSyncState {
  lastSupabaseQueryTime: number | null;
  menuDayVersions: MenuDayVersions;
  setLastSupabaseQueryTime: (timestamp: number) => void;
  setMenuDayVersions: (versions: MenuDayVersions) => void;
}

export const useDataSyncStore = create<DataSyncState>()(
  persist(
    (set) => ({
      lastSupabaseQueryTime: null,
      menuDayVersions: {},

      setLastSupabaseQueryTime: (timestamp: number) => {
        set({ lastSupabaseQueryTime: timestamp });
      },

      setMenuDayVersions: (versions: MenuDayVersions) => {
        set({ menuDayVersions: versions });
      },
    }),
    {
      name: 'data-sync-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
