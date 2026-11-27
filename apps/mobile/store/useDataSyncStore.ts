import type { MenuDayVersions } from '@ut-dining/core';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from './rnmmkv-storage';

interface DataSyncState {
  lastSupabaseQueryTime: number | null;
  menuDayVersions: MenuDayVersions;
  sharedTablesVersion: string | null;
  setLastSupabaseQueryTime: (timestamp: number) => void;
  setMenuDayVersions: (versions: MenuDayVersions) => void;
  setSharedTablesVersion: (version: string | null) => void;
}

export const useDataSyncStore = create<DataSyncState>()(
  persist(
    (set) => ({
      lastSupabaseQueryTime: null,
      menuDayVersions: {},
      sharedTablesVersion: null,

      setLastSupabaseQueryTime: (timestamp: number) => {
        set({ lastSupabaseQueryTime: timestamp });
      },

      setMenuDayVersions: (versions: MenuDayVersions) => {
        set({ menuDayVersions: versions });
      },

      setSharedTablesVersion: (version: string | null) => {
        set({ sharedTablesVersion: version });
      },
    }),
    {
      name: 'data-sync-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
