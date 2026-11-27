import { create } from 'zustand';

import { resolveVisibleSince } from '~/utils/notificationVisibility';
import { miscStorage } from './misc-storage';
import { useOnboardingStore } from './useOnboardingStore';

const NOTIFICATIONS_LAST_VISITED_KEY = 'notifications-last-visited';
const NOTIFICATIONS_VISIBLE_SINCE_KEY = 'notifications-visible-since';

const loadVisibleSince = (): number => {
  const stored = miscStorage.getNumber(NOTIFICATIONS_VISIBLE_SINCE_KEY);
  const isExistingUser =
    useOnboardingStore.getState().isOnboardingComplete ||
    miscStorage.getNumber(NOTIFICATIONS_LAST_VISITED_KEY) !== undefined;
  const visibleSince = resolveVisibleSince(stored, isExistingUser, Date.now());
  if (stored === undefined) miscStorage.set(NOTIFICATIONS_VISIBLE_SINCE_KEY, visibleSince);
  return visibleSince;
};

const notificationsStorage = {
  setLastVisited: (timestamp: number) => {
    miscStorage.set(NOTIFICATIONS_LAST_VISITED_KEY, timestamp);
  },

  getLastVisited: (): number | null => {
    const timestamp = miscStorage.getNumber(NOTIFICATIONS_LAST_VISITED_KEY);
    return timestamp ?? null;
  },

  clearLastVisited: () => {
    miscStorage.remove(NOTIFICATIONS_LAST_VISITED_KEY);
  },
};

interface NotificationsState {
  visibleSince: number;
  lastVisited: number | null;
  setVisibleSince: (timestamp: number) => void;
  setLastVisited: (timestamp: number) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  visibleSince: loadVisibleSince(),

  setVisibleSince: (timestamp: number) => {
    miscStorage.set(NOTIFICATIONS_VISIBLE_SINCE_KEY, timestamp);
    set({ visibleSince: timestamp });
  },
  lastVisited: notificationsStorage.getLastVisited(),

  setLastVisited: (timestamp: number) => {
    notificationsStorage.setLastVisited(timestamp);
    set({ lastVisited: timestamp });
  },
}));
