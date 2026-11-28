import { NativeTabs } from 'expo-router/native-tabs';

import { View } from 'react-native';

import { MealStrip, useCurrentMealStrip } from '~/components/MealStrip';
import { StatusToast } from '~/components/StatusToast';
import { useUnreadNotifications } from '~/hooks/useUnreadNotifications';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

export default function Layout() {
  const theme = useTheme();
  const { unreadCount, hasUnread } = useUnreadNotifications();
  const mealStrip = useCurrentMealStrip();
  const contentStyle = { backgroundColor: theme.background };

  return (
    <View style={{ flex: 1 }}>
      <NativeTabs
        tintColor={theme.tint}
        iconColor={theme.secondaryLabel}
        badgeBackgroundColor={theme.tint}
        minimizeBehavior="onScrollDown"
        screenListeners={({ navigation }) => ({
          tabPress: () => {
            if (!navigation.isFocused()) haptics.selection();
          },
        })}
      >
        {mealStrip && (
          <NativeTabs.BottomAccessory>
            <MealStrip strip={mealStrip} />
          </NativeTabs.BottomAccessory>
        )}
        <NativeTabs.Trigger
          contentStyle={contentStyle}
          name="(home)"
          testID="home-tab"
          accessibilityLabel="Home"
        >
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
          <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={contentStyle}
          name="map"
          testID="map-tab"
          accessibilityLabel="Map"
        >
          <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
          <NativeTabs.Trigger.Label hidden>Map</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={contentStyle}
          name="notifications"
          testID="notifications-tab"
          accessibilityLabel="Notifications"
        >
          <NativeTabs.Trigger.Icon
            sf={{ default: 'bell', selected: 'bell.fill' }}
            md="notifications"
          />
          <NativeTabs.Trigger.Label hidden>Notifications</NativeTabs.Trigger.Label>
          {hasUnread && unreadCount > 0 && (
            <NativeTabs.Trigger.Badge>{String(unreadCount)}</NativeTabs.Trigger.Badge>
          )}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={contentStyle}
          name="settings"
          testID="settings-tab"
          accessibilityLabel="Settings"
        >
          <NativeTabs.Trigger.Icon
            sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
            md="settings"
          />
          <NativeTabs.Trigger.Label hidden>Settings</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          contentStyle={contentStyle}
          name="search"
          role="search"
          testID="search-tab"
          accessibilityLabel="Search"
        >
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
          <NativeTabs.Trigger.Label hidden>Search</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <StatusToast hasAccessory={Boolean(mealStrip)} />
    </View>
  );
}
