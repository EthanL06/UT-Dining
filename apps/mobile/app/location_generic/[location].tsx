import * as Device from 'expo-device';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Navigation, X } from 'lucide-react-native';
import { useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PLACE_ICONS, usePlaceColor } from '~/components/map/MapSheet';
import PlaceDetails, { openPlaceDirections } from '~/components/PlaceDetails';
import { Image } from '~/components/ui/Image';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
import { useLocationDetails } from '~/hooks/useLocationDetails';
import { analytics } from '~/services/analytics/posthog';
import { useSettingsStore } from '~/store/useSettingsStore';
import { displayLocationName } from '~/utils/locationName';
import { useTheme } from '~/utils/theme';
import { getLocationStatusText, isLocationOpen } from '~/utils/time';

const COVER_HEIGHT = 240;

export default function LocationGenericScreen() {
  const { location } = useLocalSearchParams<{ location: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const [imageFailed, setImageFailed] = useState(false);

  const { status: lookup, locationData } = useLocationDetails(location || '');
  const typeColor = usePlaceColor(locationData?.type ?? '');
  const TypeIcon = PLACE_ICONS[locationData?.type ?? ''] ?? MapPin;
  const isTablet = Device.deviceType === Device.DeviceType.TABLET;

  const trackScreen = useEffectEvent(() => {
    analytics.screen(location);
  });
  useEffect(() => {
    trackScreen();
  }, []);

  if (!locationData) {
    return (
      <View
        className="flex-1 items-center justify-center gap-y-4 px-8"
        style={{ backgroundColor: theme.background }}
      >
        {lookup === 'loading' ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <Text variant="headline" className="text-center" testID="place-unavailable">
              {lookup === 'error' ? "Couldn't load this place" : "This place isn't listed anymore"}
            </Text>
            <Pressable
              testID="back-button"
              accessibilityRole="button"
              onPress={() => router.back()}
              className="h-11 justify-center rounded-full px-5"
              style={{ backgroundColor: theme.fill }}
            >
              <Text variant="callout" emphasized>
                Close
              </Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const displayName = displayLocationName(locationData, useColloquialNames) || location;
  const isOpen = isLocationOpen(locationData);
  const status = getLocationStatusText(locationData, isOpen);
  const showImage = !!locationData.image && !imageFailed;

  const openDirections = () => openPlaceDirections(locationData);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OverflowScrollView
        divider={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={{ height: COVER_HEIGHT, backgroundColor: typeColor }}>
          {showImage ? (
            <Image
              source={{ uri: locationData.image as string }}
              style={{ width, height: COVER_HEIGHT }}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
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
              <Text variant="subheadline" emphasized tone="onTint" className="text-center">
                Temporarily closed
              </Text>
            </View>
          )}
          <Text variant="title1">{displayName}</Text>
          <Text variant="subheadline" tone="secondary" className="mt-0.5">
            <Text
              variant="subheadline"
              emphasized
              color={isOpen ? theme.tint : theme.secondaryLabel}
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
            <Text variant="callout" emphasized tone="onTint">
              Directions
            </Text>
          </Pressable>
        </View>

        <PlaceDetails place={locationData} />

        {isTablet && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.dismissTo('/')}
            className="mx-4 mt-2 h-12 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.fill }}
          >
            <Text variant="callout" emphasized>
              Back to Home
            </Text>
          </Pressable>
        )}
      </OverflowScrollView>
    </View>
  );
}
