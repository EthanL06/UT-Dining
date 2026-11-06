import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Navigation, X } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useEffectEvent, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PLACE_ICONS, usePlaceColor } from '~/components/map/MapSheet';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { PAYMENT_INFO_ICONS } from '~/data/PaymentInfo';
import { useDatabase } from '~/hooks/useDatabase';
import { useLocationDetails } from '~/hooks/useLocationDetails';
import { getSafePostHog } from '~/services/analytics/posthog';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getLocationName } from '~/utils/locations';
import { useTheme } from '~/utils/theme';
import { generateSchedule, getLocationStatusText, isLocationOpen } from '~/utils/time';

const COVER_HEIGHT = 240;

export default function LocationGenericScreen() {
  const { location } = useLocalSearchParams<{ location: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const db = useDatabase();
  const [imageFailed, setImageFailed] = useState(false);
  const analytics = getSafePostHog(usePostHog());

  const { locationData } = useLocationDetails(location || '');
  const typeColor = usePlaceColor(locationData?.type ?? '');
  const TypeIcon = PLACE_ICONS[locationData?.type ?? ''] ?? MapPin;
  const isTablet = Device.deviceType === Device.DeviceType.TABLET;

  const trackScreen = useEffectEvent(() => {
    analytics.screen(location);
  });
  useEffect(() => {
    trackScreen();
  }, []);

  if (!location || !locationData) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="small" />
      </View>
    );
  }

  const displayName = getLocationName(db, location, useColloquialNames);
  const isOpen = isLocationOpen(locationData);
  const status = getLocationStatusText(locationData, isOpen);
  const schedule = generateSchedule(locationData, false);
  const paymentMethods = Array.isArray(locationData.methods_of_payment)
    ? (locationData.methods_of_payment as string[])
    : [];
  const showImage = !!locationData.image && !imageFailed;

  const openDirections = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(
      Platform.OS === 'ios' ? locationData.apple_maps_link : locationData.google_maps_link,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={{ height: COVER_HEIGHT, backgroundColor: typeColor }}>
          {showImage ? (
            <Image
              source={{ uri: locationData.image as string }}
              style={{ width, height: COVER_HEIGHT }}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <TypeIcon size={72} color="rgba(255,255,255,0.75)" />
            </View>
          )}
          <Pressable
            testID="back-button"
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={() => router.back()}
            className="absolute top-4 left-4 size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          >
            <X size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View className="px-5 pt-4 pb-3">
          {locationData.force_close && (
            <View className="mb-3 rounded-2xl bg-red-600 px-4 py-2.5">
              <Text className="text-center font-bold text-[15px] text-white">
                Temporarily closed
              </Text>
            </View>
          )}
          <Text className="font-bold text-[28px] leading-[33px]" style={{ color: theme.label }}>
            {displayName}
          </Text>
          <Text className="mt-0.5 text-[15px]" style={{ color: theme.secondaryLabel }}>
            <Text
              className="font-semibold"
              style={{ color: isOpen ? theme.tint : theme.secondaryLabel }}
            >
              {isOpen ? 'Open' : status}
            </Text>
            {isOpen ? status.replace(/^Open/, '') : ''}
            {locationData.type ? ` · ${locationData.type}` : ''}
          </Text>
        </View>

        <View className="mx-4 mb-5">
          <Pressable
            testID="generic-directions-button"
            accessibilityRole="button"
            onPress={openDirections}
            className="h-12 flex-row items-center justify-center gap-x-2 rounded-full"
            style={{ backgroundColor: theme.tint }}
          >
            <Navigation size={17} color="#FFFFFF" />
            <Text className="font-semibold text-[16px] text-white">Directions</Text>
          </Pressable>
        </View>

        {locationData.description !== '' && (
          <GroupedSection header="About">
            <View className="px-4 py-3">
              <Text className="text-[15px] leading-5" style={{ color: theme.label }}>
                {locationData.description}
              </Text>
            </View>
          </GroupedSection>
        )}

        {schedule.length > 0 && (
          <GroupedSection header="Hours">
            {schedule.map((entry, index) => (
              <GroupedRow
                key={`${entry.dayRange}-${entry.time}`}
                isFirst={index === 0}
                title={entry.dayRange}
                trailing={
                  <Text className="text-right text-[15px]" style={{ color: theme.secondaryLabel }}>
                    {entry.time.replace(/, /g, '\n')}
                  </Text>
                }
              />
            ))}
          </GroupedSection>
        )}

        {paymentMethods.length > 0 && (
          <GroupedSection header="Payment">
            {paymentMethods.map((method, index) => (
              <GroupedRow
                key={method}
                isFirst={index === 0}
                separatorInset={56}
                leading={
                  method in PAYMENT_INFO_ICONS ? (
                    <Image
                      source={PAYMENT_INFO_ICONS[method as keyof typeof PAYMENT_INFO_ICONS]}
                      className="size-7"
                      resizeMode="contain"
                    />
                  ) : undefined
                }
                title={method}
              />
            ))}
          </GroupedSection>
        )}

        <GroupedSection header="Address">
          <GroupedRow
            isFirst
            separatorInset={56}
            leading={<MapPin size={20} color={theme.tint} />}
            title={locationData.address}
            showChevron
            onPress={openDirections}
          />
        </GroupedSection>

        {isTablet && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.dismissTo('/')}
            className="mx-4 mt-2 h-12 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.fill }}
          >
            <Text className="font-semibold text-[16px]" style={{ color: theme.label }}>
              Back to Home
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
