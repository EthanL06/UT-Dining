import * as Haptics from 'expo-haptics';
import { NativeTabs } from 'expo-router/native-tabs';

import { useUnreadNotifications } from '~/hooks/useUnreadNotifications';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';

export default function Layout() {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const { unreadCount, hasUnread } = useUnreadNotifications();

  const handleTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <NativeTabs
      tintColor={COLORS['ut-burnt-orange']}
      iconColor={isDarkMode ? COLORS['ut-grey-dark-mode'] : COLORS['ut-grey']}
      badgeBackgroundColor={COLORS['ut-burnt-orange']}
      screenListeners={{ tabPress: handleTabPress }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bell', selected: 'bell.fill' }}
          md="notifications"
        />
        <NativeTabs.Trigger.Label>Notifications</NativeTabs.Trigger.Label>
        {hasUnread && unreadCount > 0 && (
          <NativeTabs.Trigger.Badge>{String(unreadCount)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
