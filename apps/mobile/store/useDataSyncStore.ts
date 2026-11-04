import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from './rnmmkv-storage';

interface DataSyncState {
  lastSupabaseQueryTime: number | null;
  setLastSupabaseQueryTime: (timestamp: number) => void;
}

export const useDataSyncStore = create<DataSyncState>()(
  persist(
    (set) => ({
      lastSupabaseQueryTime: null,

      setLastSupabaseQueryTime: (timestamp: number) => {
        set({ lastSupabaseQueryTime: timestamp });
      },
    }),
    {
      name: 'data-sync-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
