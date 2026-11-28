import { View } from 'react-native';
import ActionSheet, { ScrollView, type SheetProps, useSheetRef } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceDetails from '~/components/PlaceDetails';
import { PlaceDetailsSkeleton } from '~/components/PlaceDetailsSkeleton';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { PressableScale } from '~/components/ui/PressableScale';
import { SkeletonPulse } from '~/components/ui/Skeleton';
import { Text } from '~/components/ui/Text';
import { useLocationDetails } from '~/hooks/useLocationDetails';
import { useSettingsStore } from '~/store/useSettingsStore';
import { useLocationName } from '~/utils/locations';
import { useTheme } from '~/utils/theme';

const LocationAboutSheet = ({ sheetId, payload }: SheetProps<'location-about'>) => {
  const insets = useSafeAreaInsets();
  const sheetRef = useSheetRef();
  const theme = useTheme();
  const locationName = payload?.location?.name;
  const { status, locationData } = useLocationDetails(locationName || '');
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const displayName = useLocationName(locationName || '', useColloquialNames);

  return (
    <ActionSheet
      id={sheetId}
      defaultOverlayOpacity={0.3}
      containerStyle={{
        backgroundColor: theme.background,
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
      }}
      indicatorStyle={{ backgroundColor: theme.tertiaryLabel, width: 36 }}
      gestureEnabled
      safeAreaInsets={insets}
      useBottomSafeAreaPadding
    >
      <View className="flex-row items-center justify-between gap-x-3 px-4 pt-1 pb-3">
        <Text variant="title2" numberOfLines={1} className="flex-1 pl-1">
          {displayName}
        </Text>
        <PressableScale
          testID="location-about-done-button"
          accessibilityRole="button"
          onPress={() => sheetRef.current?.hide()}
          className="h-9 justify-center rounded-full px-3.5"
          style={{ backgroundColor: theme.card }}
        >
          <Text variant="subheadline" emphasized tone="tint">
            Done
          </Text>
        </PressableScale>
      </View>
      <OverflowScrollView
        as={ScrollView}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 560 }}
      >
        {status === 'loading' ? (
          <SkeletonPulse
            testID="location-about-loading"
            label="Loading details"
            style={{ paddingBottom: 16 }}
          >
            <PlaceDetailsSkeleton />
          </SkeletonPulse>
        ) : !locationData ? (
          <Text variant="subheadline" tone="secondary" className="px-5 py-10 text-center">
            Unable to load details for this place.
          </Text>
        ) : (
          <View className="pb-4">
            <PlaceDetails place={locationData} />
          </View>
        )}
      </OverflowScrollView>
    </ActionSheet>
  );
};

export default LocationAboutSheet;
