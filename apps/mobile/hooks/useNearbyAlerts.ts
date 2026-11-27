import { useCallback, useSyncExternalStore } from 'react';
import { Alert, Linking } from 'react-native';
import { usePermission } from '~/hooks/usePermission';
import { analytics } from '~/services/analytics/posthog';
import {
  mutedNearbyZones,
  requestNearbyPermissions,
  subscribeToNearbyHistory,
  unmuteNearbyZones,
} from '~/services/nearby/nearbyAlerts';
import { useSettingsStore } from '~/store/useSettingsStore';
import { haptics } from '~/utils/haptics';
import { log } from '~/utils/log';
import { nearbyAlertsView } from '~/utils/nearbyAlerts';

const PERMISSION_COPY = {
  needs_location: {
    title: 'Allow Location “Always”',
    message:
      'Nearby menus need location access set to Always, so iOS can tell UT Dining when you reach a dining hall. Your location stays on your phone.',
  },
  needs_notifications: {
    title: 'Turn On Notifications',
    message: 'Nearby menus arrive as notifications. Turn them on for UT Dining in Settings.',
  },
} as const;

export const showNearbyPermissionAlert = (kind: keyof typeof PERMISSION_COPY) => {
  const copy = PERMISSION_COPY[kind];
  Alert.alert(copy.title, copy.message, [
    { text: 'Not Now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => void Linking.openSettings() },
  ]);
};

const mutedSnapshot = () => mutedNearbyZones().join('|');

const mutedZoneNames = (snapshot: string) =>
  snapshot === '' ? [] : snapshot.split('|').map((zone) => zone.split('+').join(' and '));

export function useNearbyAlerts() {
  const muted = mutedZoneNames(useSyncExternalStore(subscribeToNearbyHistory, mutedSnapshot));
  const isEnabled = useSettingsStore((state) => state.isNearbyAlertsEnabled);
  const setEnabled = useSettingsStore((state) => state.setNearbyAlertsEnabled);
  const location = usePermission('backgroundLocation');
  const notifications = usePermission('notifications');
  const view = nearbyAlertsView(isEnabled, location.state, notifications.state);
  const refreshLocation = location.refresh;
  const refreshNotifications = notifications.refresh;

  const turnOn = useCallback(async () => {
    try {
      const result = await requestNearbyPermissions();
      await Promise.all([refreshLocation(), refreshNotifications()]);
      analytics.capture('nearby_alerts_toggled', { enabled: true, result });
      if (result === 'granted') {
        setEnabled(true);
        haptics.success();
        return;
      }
      showNearbyPermissionAlert(result);
    } catch (error) {
      log.error('Could not turn on nearby alerts', error);
    }
  }, [refreshLocation, refreshNotifications, setEnabled]);

  const turnOff = useCallback(() => {
    setEnabled(false);
    analytics.capture('nearby_alerts_toggled', { enabled: false });
  }, [setEnabled]);

  const resumeMuted = useCallback(() => {
    unmuteNearbyZones();
    haptics.success();
  }, []);

  return { view, muted, turnOn, turnOff, resumeMuted };
}
