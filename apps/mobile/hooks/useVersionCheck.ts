import * as Application from 'expo-application';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { getChangelogEntry } from '~/data/Changelog';
import { getSafePostHog } from '~/services/analytics/posthog';
import { APP_STORE_URL, fetchAppStoreRelease } from '~/services/appStore/appStore';
import { getAppInformation } from '~/services/database/database';
import { useChangelogPromptStore, useChangelogStore } from '~/store/useChangelogStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { isNewerVersion } from '~/utils/version';
import { useDatabase } from './useDatabase';

const PRODUCTION_BUNDLE_ID = 'com.ethanl06.ut-dining';
const APP_STORE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export const useVersionCheck = () => {
  const db = useDatabase();
  const rawPosthog = usePostHog();
  const posthog = useMemo(() => getSafePostHog(rawPosthog), [rawPosthog]);
  const lastAppStoreCheckRef = useRef(0);

  const checkForUpdate = useCallback(async () => {
    const currentVersion = Application.nativeApplicationVersion;
    if (!currentVersion || __DEV__) return false;
    if (useChangelogPromptStore.getState().prompt) return true;

    try {
      const appInfo = await getAppInformation(db);
      const requiredVersion = appInfo?.app_version;
      const updateRequired = !!requiredVersion && isNewerVersion(currentVersion, requiredVersion);

      posthog.capture('version_check_performed', {
        current_version: currentVersion,
        latest_version: requiredVersion ?? '',
        update_required: updateRequired,
      });

      if (updateRequired && requiredVersion) {
        useChangelogPromptStore.getState().showPrompt({
          kind: 'update',
          version: requiredVersion,
          required: true,
          releaseNotes: null,
        });
        return true;
      }
    } catch (error) {
      posthog.capture('version_check_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (Application.applicationId !== PRODUCTION_BUNDLE_ID) return false;
    if (Date.now() - lastAppStoreCheckRef.current < APP_STORE_CHECK_INTERVAL_MS) return false;
    lastAppStoreCheckRef.current = Date.now();

    try {
      const release = await fetchAppStoreRelease();
      if (!release || !isNewerVersion(currentVersion, release.version)) return false;
      if (useChangelogStore.getState().ignoredUpdateVersion === release.version) return false;

      useChangelogPromptStore.getState().showPrompt({
        kind: 'update',
        version: release.version,
        required: false,
        releaseNotes: release.releaseNotes,
      });
      return true;
    } catch (error) {
      console.warn('App Store version check failed:', error);
      return false;
    }
  }, [db, posthog]);

  const checkWhatsNew = useCallback(() => {
    const currentVersion = Application.nativeApplicationVersion;
    if (!currentVersion) return;

    const { lastSeenVersion, markVersionSeen } = useChangelogStore.getState();
    if (lastSeenVersion === currentVersion) return;

    const isReturningUser = useOnboardingStore.getState().isOnboardingComplete;
    if (!isReturningUser || !getChangelogEntry(currentVersion)) {
      markVersionSeen(currentVersion);
      return;
    }

    useChangelogPromptStore.getState().showPrompt({ kind: 'whats-new', version: currentVersion });
  }, []);

  useEffect(() => {
    checkForUpdate().then((shown) => {
      if (!shown) checkWhatsNew();
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') checkForUpdate();
    });
    return () => subscription.remove();
  }, [checkForUpdate, checkWhatsNew]);

  const openAppStore = useCallback(
    async (version: string) => {
      posthog.capture('update_button_pressed', {
        platform: Platform.OS,
        app_store_url: APP_STORE_URL ?? '',
        version,
      });

      if (!APP_STORE_URL) return;
      try {
        await Linking.openURL(APP_STORE_URL);
      } catch (error) {
        posthog.capture('update_button_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [posthog],
  );

  const handleUpdate = useCallback(
    (version: string) => {
      const prompt = useChangelogPromptStore.getState().prompt;
      if (!(prompt?.kind === 'update' && prompt.required)) {
        useChangelogPromptStore.getState().hidePrompt();
      }
      openAppStore(version);
    },
    [openAppStore],
  );

  const handleIgnore = useCallback(
    (version: string) => {
      posthog.capture('update_ignored', { version });
      useChangelogStore.getState().ignoreUpdate(version);
      useChangelogPromptStore.getState().hidePrompt();
    },
    [posthog],
  );

  const handleDismissWhatsNew = useCallback((version: string) => {
    useChangelogStore.getState().markVersionSeen(version);
    useChangelogPromptStore.getState().hidePrompt();
  }, []);

  return { handleUpdate, handleIgnore, handleDismissWhatsNew };
};
