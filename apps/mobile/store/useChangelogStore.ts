import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from './rnmmkv-storage';

interface ChangelogState {
  lastSeenVersion: string | null;
  ignoredUpdateVersion: string | null;
  markVersionSeen: (version: string) => void;
  ignoreUpdate: (version: string) => void;
  resetChangelog: () => void;
}

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
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
  | { kind: 'update'; version: string; required: boolean; releaseNotes: string | null }
  | { kind: 'whats-new'; version: string };

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
