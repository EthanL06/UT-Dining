import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDatabase } from '~/hooks/useDatabase';
import { nearbyHalls, startNearbyAlerts, stopNearbyAlerts } from '~/services/nearby/nearbyAlerts';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getLocationName } from '~/utils/locations';
import { log } from '~/utils/log';
import { readCachedMenuData } from '~/utils/queries';

export function NearbyAlertsInitializer() {
  const db = useDatabase();
  const isEnabled = useSettingsStore((state) => state.isNearbyAlertsEnabled);
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const { data } = useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(db),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const locations = data?.locations;

  useEffect(() => {
    if (!isEnabled) {
      stopNearbyAlerts().catch((error: unknown) =>
        log.warn('Stopping nearby alerts failed', { error }),
      );
      return;
    }
    if (!locations) return;

    const sync = async () => {
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== 'granted') return;
      await startNearbyAlerts(
        nearbyHalls(db, locations, (name) => getLocationName(db, name, useColloquialNames)),
      );
    };
    const run = () => {
      sync().catch((error: unknown) => log.warn('Updating nearby alerts failed', { error }));
    };

    run();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    return () => subscription.remove();
  }, [db, isEnabled, locations, useColloquialNames]);

  return null;
}
