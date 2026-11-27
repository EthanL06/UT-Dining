import { create } from 'zustand';
import { addRecent, type RecentSearch } from '~/utils/mapSearch';
import { miscStorage } from './misc-storage';

const RECENTS_KEY = 'map-search-recents';

const readRecents = (): RecentSearch[] => {
  try {
    const parsed: unknown = JSON.parse(miscStorage.getString(RECENTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as RecentSearch[]) : [];
  } catch {
    return [];
  }
};

interface MapRecentsState {
  recents: RecentSearch[];
  remember: (recent: RecentSearch) => void;
  clear: () => void;
}

export const useMapRecentsStore = create<MapRecentsState>((set, get) => ({
  recents: readRecents(),
  remember: (recent) => {
    const recents = addRecent(get().recents, recent);
    miscStorage.set(RECENTS_KEY, JSON.stringify(recents));
    set({ recents });
  },
  clear: () => {
    miscStorage.remove(RECENTS_KEY);
    set({ recents: [] });
  },
}));
