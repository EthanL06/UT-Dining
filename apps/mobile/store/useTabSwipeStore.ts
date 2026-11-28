import { create } from 'zustand';

import type { TabEntry } from '~/utils/tabSwipe';

interface TabSwipeState {
  entry: TabEntry;
  setEntry: (entry: TabEntry) => void;
}

export const useTabSwipeStore = create<TabSwipeState>((set) => ({
  entry: { kind: 'none' },
  setEntry: (entry) => set({ entry }),
}));
