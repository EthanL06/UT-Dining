import { create } from 'zustand';
import { isDevVariant } from '~/utils/appVariant';
import { miscStorage } from './misc-storage';

const KEY = 'qa-force-skeletons';

interface QaSkeletonState {
  forceSkeletons: boolean;
  setForceSkeletons: (on: boolean) => void;
}

export const useQaSkeletonStore = create<QaSkeletonState>((set) => ({
  forceSkeletons: isDevVariant && miscStorage.getBoolean(KEY) === true,
  setForceSkeletons: (on) => {
    if (!isDevVariant) return;
    if (on) miscStorage.set(KEY, true);
    else miscStorage.remove(KEY);
    set({ forceSkeletons: on });
  },
}));

export const useForcedSkeletons = () => useQaSkeletonStore((state) => state.forceSkeletons);
