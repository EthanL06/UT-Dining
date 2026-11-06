import { Platform } from 'react-native';

export const ITUNES_ITEM_ID = '6743042002';

export const APP_STORE_URL = Platform.select({
  ios: `https://apps.apple.com/us/app/ut-dining/id${ITUNES_ITEM_ID}`,
  android: 'https://play.google.com/store/apps/details?id=com.utdining.app',
});

export interface AppStoreRelease {
  version: string;
  releaseNotes: string | null;
}

export const fetchAppStoreRelease = async (): Promise<AppStoreRelease | null> => {
  if (Platform.OS !== 'ios') return null;

  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${ITUNES_ITEM_ID}&country=us&t=${Date.now()}`,
  );
  if (!response.ok) return null;

  const body = (await response.json()) as {
    results?: { version?: string; releaseNotes?: string }[];
  };
  const result = body.results?.[0];
  if (!result?.version) return null;

  return { version: result.version, releaseNotes: result.releaseNotes?.trim() || null };
};
