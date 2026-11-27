import { MapPinned } from 'lucide-react-native';
import { Switch } from 'react-native';
import { GroupedRow, IconSquare } from '~/components/ui/Grouped';
import { showNearbyPermissionAlert, useNearbyAlerts } from '~/hooks/useNearbyAlerts';
import type { NearbyAlertsView } from '~/utils/nearbyAlerts';
import { useTheme } from '~/utils/theme';

const NEARBY_COLOR = '#2E9E4F';

const subtitleFor = (view: NearbyAlertsView, muted: string[]) => {
  switch (view.kind) {
    case 'needs_location':
      return 'Set Location to “Always” in Settings to get these';
    case 'needs_notifications':
      return 'Turn on notifications in Settings to get these';
    case 'on':
      if (muted.length > 0) return `Stopped for ${muted.join(', ')}. Tap to turn back on.`;
      return 'A heads-up with the menu when you arrive at an open dining hall';
    case 'checking':
    case 'off':
      return 'A heads-up with the menu when you arrive at an open dining hall';
    default:
      return view satisfies never;
  }
};

export const NearbyAlertsRow = ({
  isFirst,
  separatorInset,
}: {
  isFirst?: boolean;
  separatorInset: number;
}) => {
  const theme = useTheme();
  const { view, muted, turnOn, turnOff, resumeMuted } = useNearbyAlerts();
  const needsPermission = view.kind === 'needs_location' || view.kind === 'needs_notifications';

  return (
    <GroupedRow
      testID="nearby-alerts-row"
      isFirst={isFirst}
      separatorInset={separatorInset}
      leading={<IconSquare Icon={MapPinned} color={NEARBY_COLOR} />}
      title="Nearby Menus"
      subtitle={subtitleFor(view, muted)}
      multilineSubtitle
      onPress={
        view.kind === 'needs_location' || view.kind === 'needs_notifications'
          ? () => showNearbyPermissionAlert(view.kind)
          : view.kind === 'on' && muted.length > 0
            ? resumeMuted
            : undefined
      }
      trailing={
        <Switch
          testID="nearby-alerts-switch"
          accessibilityLabel="Nearby Menus"
          value={view.kind !== 'off' && !needsPermission}
          onValueChange={(next) => (next ? void turnOn() : turnOff())}
          trackColor={{ true: theme.tint }}
        />
      }
    />
  );
};
