import * as Updates from 'expo-updates';
import { miscStorage } from '~/store/misc-storage';
import { isReplayedLaunchLink } from '~/utils/previews';

const CHANNEL_HEADER = 'expo-channel-name';
const RELOADED_AT_KEY = 'qa.reloadedAt';

export type LoadResult = 'reloading' | 'up-to-date';

export const reloadApp = async () => {
  miscStorage.set(RELOADED_AT_KEY, Date.now());
  await Updates.reloadAsync();
};

export const consumeReloadReplay = (now = Date.now()) => {
  const reloadedAt = miscStorage.getNumber(RELOADED_AT_KEY);
  miscStorage.remove(RELOADED_AT_KEY);
  return isReplayedLaunchLink(reloadedAt, now);
};

export const loadLatestUpdate = async (): Promise<LoadResult> => {
  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) return 'up-to-date';
  await Updates.fetchUpdateAsync();
  await reloadApp();
  return 'reloading';
};

export const switchUpdateChannel = (channel: string | null): Promise<LoadResult> => {
  Updates.setUpdateRequestHeadersOverride(channel ? { [CHANNEL_HEADER]: channel } : null);
  return loadLatestUpdate();
};
