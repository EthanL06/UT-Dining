import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Bell, Check, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Text, View } from 'react-native';

import { GroupedRow, GroupedSection, IconSquare } from '~/components/ui/Grouped';
import { log } from '~/utils/log';
import { useTheme } from '~/utils/theme';
import OnboardingHeader from './OnboardingHeader';

type Props = {
  width: number;
  onPermissionsChange: (permissions: PermissionState) => void;
};

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface PermissionState {
  location: PermissionStatus;
  notifications: PermissionStatus;
}

const toState = (location: string, notifications: string): PermissionState => ({
  location: location === 'granted' ? 'granted' : 'denied',
  notifications: notifications === 'granted' ? 'granted' : 'denied',
});

const PermissionStatusLabel = ({ status }: { status: PermissionStatus }) => {
  const theme = useTheme();
  if (status === 'granted') return <Check size={20} color={theme.tint} strokeWidth={2.5} />;
  return (
    <Text className="text-[15px]" style={{ color: theme.secondaryLabel }}>
      {status === 'denied' ? 'Off' : ''}
    </Text>
  );
};

const PermissionsScreen = ({ width, onPermissionsChange }: Props) => {
  const theme = useTheme();
  const [permissions, setPermissions] = useState<PermissionState>({
    location: 'undetermined',
    notifications: 'undetermined',
  });

  useEffect(() => {
    const apply = (next: PermissionState) => {
      setPermissions(next);
      onPermissionsChange(next);
    };

    const requestPermissions = async () => {
      try {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
        apply(toState(locationStatus, notificationStatus));
      } catch (error) {
        log.error('Error requesting permissions', error);
      }
    };

    const checkPermissions = async () => {
      try {
        const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
        const { status: notificationStatus } = await Notifications.getPermissionsAsync();
        apply(toState(locationStatus, notificationStatus));
      } catch (error) {
        log.error('Error checking permissions', error);
      }
    };

    requestPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') checkPermissions();
    });

    return () => subscription.remove();
  }, [onPermissionsChange]);

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
