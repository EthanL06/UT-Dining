import { useNearbyAlertZones } from '~/hooks/useNearbyAlertZones';

export function NearbyAlertsInitializer() {
  useNearbyAlertZones();
  return null;
}
