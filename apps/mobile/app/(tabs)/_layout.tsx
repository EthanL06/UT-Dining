import * as Haptics from 'expo-haptics';
import { NativeTabs } from 'expo-router/native-tabs';

import { MealStrip, useCurrentMealStrip } from '~/components/MealStrip';
import { useUnreadNotifications } from '~/hooks/useUnreadNotifications';
import { useTheme } from '~/utils/theme';

export default function Layout() {
  const theme = useTheme();
  const { unreadCount, hasUnread } = useUnreadNotifications();
  const mealStrip = useCurrentMealStrip();

  const handleTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <NativeTabs
      tintColor={theme.tint}
      iconColor={theme.secondaryLabel}
      badgeBackgroundColor={theme.tint}
      minimizeBehavior="onScrollDown"
      screenListeners={{ tabPress: handleTabPress }}
    >
      {mealStrip && (
        <NativeTabs.BottomAccessory>
          <MealStrip strip={mealStrip} />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
        <NativeTabs.Trigger.Label hidden>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bell', selected: 'bell.fill' }}
          md="notifications"
        />
        <NativeTabs.Trigger.Label hidden>Notifications</NativeTabs.Trigger.Label>
        {hasUnread && unreadCount > 0 && (
          <NativeTabs.Trigger.Badge>{String(unreadCount)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
        <NativeTabs.Trigger.Label hidden>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* biome-ignore lint/a11y/useSemanticElements: role sets the native iOS search tab, not an ARIA role */}
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label hidden>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
