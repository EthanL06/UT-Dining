import { create } from 'zustand';
import type { FavoriteOverride } from '~/utils/favoriteOverride';

interface FavoriteOverridesState {
  overrides: Record<string, FavoriteOverride>;
  begin: (key: string, value: boolean) => number;
  markWritten: (key: string, seq: number) => void;
  clear: (key: string, seq: number) => void;
}

let nextSeq = 0;

export const useFavoriteOverridesStore = create<FavoriteOverridesState>()((set, get) => ({
  overrides: {},
  begin: (key, value) => {
    nextSeq += 1;
    const seq = nextSeq;
    set((state) => ({
      overrides: { ...state.overrides, [key]: { value, status: 'writing', seq } },
    }));
    return seq;
  },
  markWritten: (key, seq) => {
    const current = get().overrides[key];
    if (current?.seq !== seq) return;
    set((state) => ({
      overrides: { ...state.overrides, [key]: { ...current, status: 'written' } },
    }));
  },
  clear: (key, seq) => {
    if (get().overrides[key]?.seq !== seq) return;
    set((state) => {
      const { [key]: _removed, ...rest } = state.overrides;
      return { overrides: rest };
    });
  },
}));
