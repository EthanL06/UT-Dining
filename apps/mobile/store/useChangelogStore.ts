import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { fetchChangelog } from '~/services/changelog/changelog';
import type { ChangelogEntry } from '~/services/changelog/types';
import { zustandStorage } from './rnmmkv-storage';

interface ChangelogState {
  entries: ChangelogEntry[];
  setEntries: (entries: ChangelogEntry[]) => void;
  lastSeenVersion: string | null;
  ignoredUpdateVersion: string | null;
  markVersionSeen: (version: string) => void;
  ignoreUpdate: (version: string) => void;
  resetChangelog: () => void;
}

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
      entries: [],
      setEntries: (entries) => set({ entries }),
      lastSeenVersion: null,
      ignoredUpdateVersion: null,
      markVersionSeen: (version) => set({ lastSeenVersion: version }),
      ignoreUpdate: (version) => set({ ignoredUpdateVersion: version }),
      resetChangelog: () => set({ lastSeenVersion: null, ignoredUpdateVersion: null }),
    }),
    {
      name: 'changelog-storage',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

export type ChangelogPrompt =
  | {
      kind: 'update';
      version: string;
      required: boolean;
      releaseNotes: string | null;
      preview?: boolean;
    }
  | { kind: 'whats-new'; version: string; preview?: boolean };

interface ChangelogPromptState {
  prompt: ChangelogPrompt | null;
  showPrompt: (prompt: ChangelogPrompt) => void;
  hidePrompt: () => void;
}

export const useChangelogPromptStore = create<ChangelogPromptState>()((set) => ({
  prompt: null,
  showPrompt: (prompt) => set({ prompt }),
  hidePrompt: () => set({ prompt: null }),
}));

let refreshInFlight: Promise<boolean> | null = null;

export const refreshChangelog = () => {
  if (!refreshInFlight) {
    refreshInFlight = fetchChangelog()
      .then((entries) => {
        useChangelogStore.getState().setEntries(entries);
        return true;
      })
      .catch((error) => {
        console.warn('Changelog fetch failed:', error);
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

export const getChangelogEntry = (version: string | null | undefined) =>
  useChangelogStore.getState().entries.find((entry) => entry.version === version);
