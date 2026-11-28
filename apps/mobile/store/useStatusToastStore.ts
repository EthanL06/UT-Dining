import { create } from 'zustand';
import { isDevVariant } from '~/utils/appVariant';
import type { StatusToastKind, StatusToastPreview } from '~/utils/serviceStatus';
import { miscStorage } from './misc-storage';

const DISMISSED_KEY = 'status-toast-dismissed';
const PREVIEW_KEY = 'qa-status-toast-preview';

const TOAST_KINDS: readonly StatusToastKind[] = ['menus-behind', 'slow', 'down'];

const readKind = (key: string): StatusToastKind | null => {
  const value = miscStorage.getString(key);
  return TOAST_KINDS.find((kind) => kind === value) ?? null;
};

interface StatusToastState {
  dismissed: StatusToastKind | null;
  preview: StatusToastPreview;
  dismiss: (kind: StatusToastKind) => void;
  clearDismissed: () => void;
  setPreview: (preview: StatusToastPreview) => void;
}

export const useStatusToastStore = create<StatusToastState>((set) => ({
  dismissed: readKind(DISMISSED_KEY),
  preview: isDevVariant ? (readKind(PREVIEW_KEY) ?? 'off') : 'off',
  dismiss: (kind) => {
    miscStorage.set(DISMISSED_KEY, kind);
    set({ dismissed: kind });
  },
  clearDismissed: () => {
    miscStorage.remove(DISMISSED_KEY);
    set({ dismissed: null });
  },
  setPreview: (preview) => {
    if (!isDevVariant) return;
    if (preview === 'off') miscStorage.remove(PREVIEW_KEY);
    else miscStorage.set(PREVIEW_KEY, preview);
    miscStorage.remove(DISMISSED_KEY);
    set({ preview, dismissed: null });
  },
}));
