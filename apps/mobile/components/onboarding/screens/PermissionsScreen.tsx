import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Bell, Check, MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, View } from 'react-native';
import { GroupedRow, GroupedSection, IconSquare } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { log } from '~/utils/log';
import { useTheme } from '~/utils/theme';
import OnboardingHeader from './OnboardingHeader';

type Props = {
  width: number;
  isCurrentScreen: boolean;
  onPermissionsChange: (permissions: PermissionState) => void;
};

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface PermissionState {
  location: PermissionStatus;
  notifications: PermissionStatus;
}

const toStatus = (status: string): PermissionStatus =>
  status === 'granted' ? 'granted' : status === 'undetermined' ? 'undetermined' : 'denied';

const toState = (location: string, notifications: string): PermissionState => ({
  location: toStatus(location),
  notifications: toStatus(notifications),
});

const PermissionStatusLabel = ({ status }: { status: PermissionStatus }) => {
  const theme = useTheme();
  if (status === 'granted') return <Check size={20} color={theme.tint} strokeWidth={2.5} />;
  return (
    <Text variant="subheadline" tone="secondary">
      {status === 'denied' ? 'Off' : ''}
    </Text>
  );
};

const PermissionsScreen = ({ width, isCurrentScreen, onPermissionsChange }: Props) => {
  const theme = useTheme();
  const [permissions, setPermissions] = useState<PermissionState>({
    location: 'undetermined',
    notifications: 'undetermined',
  });
  const hasAsked = useRef(false);

  useEffect(() => {
    const apply = (next: PermissionState) => {
      setPermissions(next);
      onPermissionsChange(next);
    };

    const readPermissions = async (ask: boolean) => {
      try {
        const location = ask
          ? Location.requestForegroundPermissionsAsync
          : Location.getForegroundPermissionsAsync;
        const notifications = ask
          ? Notifications.requestPermissionsAsync
          : Notifications.getPermissionsAsync;
        const { status: locationStatus } = await location();
        const { status: notificationStatus } = await notifications();
        apply(toState(locationStatus, notificationStatus));
      } catch (error) {
        log.error('Error reading permissions', error);
      }
    };

    if (isCurrentScreen && !hasAsked.current) {
      hasAsked.current = true;
      void readPermissions(true);
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && hasAsked.current) void readPermissions(false);
    });

    return () => subscription.remove();
  }, [isCurrentScreen, onPermissionsChange]);

  const openSettings = () => {
    Alert.alert('Open Settings', 'To turn on permissions, go to your device settings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
  };

  return (
    <View style={{ width, backgroundColor: theme.background }} className="flex-1 justify-center">
      <OnboardingHeader
        title="Enable Permissions"
        subtitle="Two optional permissions make UT Dining more useful."
      />
      <GroupedSection footer="You can change these at any time in Settings.">
        <GroupedRow
          isFirst
          separatorInset={58}
          leading={<IconSquare Icon={MapPin} color="#0A84FF" />}
          title="Location Services"
          subtitle="Shows where you are on the campus map"
          multilineSubtitle
          trailing={<PermissionStatusLabel status={permissions.location} />}
          onPress={permissions.location === 'denied' ? openSettings : undefined}
        />
        <GroupedRow
          separatorInset={58}
          leading={<IconSquare Icon={Bell} color="#E0463F" />}
          title="Push Notifications"
          subtitle="Menu updates, hours changes and more"
          multilineSubtitle
          trailing={<PermissionStatusLabel status={permissions.notifications} />}
          onPress={permissions.notifications === 'denied' ? openSettings : undefined}
        />
      </GroupedSection>
    </View>
  );
};

export default PermissionsScreen;
