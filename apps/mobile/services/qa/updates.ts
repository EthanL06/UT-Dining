import * as Updates from 'expo-updates';

const CHANNEL_HEADER = 'expo-channel-name';

export type LoadResult = 'reloading' | 'up-to-date';

export const loadLatestUpdate = async (): Promise<LoadResult> => {
  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) return 'up-to-date';
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
  return 'reloading';
};

export const switchUpdateChannel = (channel: string | null): Promise<LoadResult> => {
  Updates.setUpdateRequestHeadersOverride(channel ? { [CHANNEL_HEADER]: channel } : null);
  return loadLatestUpdate();
};
