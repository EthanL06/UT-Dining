import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import ActionSheet, { ScrollView, type SheetProps, useSheetRef } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PlaceDetails from '~/components/PlaceDetails';
import { useLocationDetails } from '~/hooks/useLocationDetails';
import { useSettingsStore } from '~/store/useSettingsStore';
import { useLocationName } from '~/utils/locations';
import { useTheme } from '~/utils/theme';

const LocationAboutSheet = ({ sheetId, payload }: SheetProps<'location-about'>) => {
  const insets = useSafeAreaInsets();
  const sheetRef = useSheetRef();
  const theme = useTheme();
  const locationName = payload?.location?.name;
  const { locationData, loading, error } = useLocationDetails(locationName || '');
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
        <Text
          numberOfLines={1}
          className="flex-1 pl-1 font-bold text-[22px]"
          style={{ color: theme.label }}
        >
          {displayName}
        </Text>
        <Pressable
          testID="location-about-done-button"
          accessibilityRole="button"
          onPress={() => sheetRef.current?.hide()}
          className="h-9 justify-center rounded-full px-3.5"
          style={{ backgroundColor: theme.card }}
        >
          <Text className="font-semibold text-[15px]" style={{ color: theme.tint }}>
            Done
          </Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="small" />
          </View>
        ) : error || !locationData ? (
          <Text
            className="px-5 py-10 text-center text-[15px]"
            style={{ color: theme.secondaryLabel }}
          >
            Unable to load details for this place.
          </Text>
        ) : (
          <View className="pb-4">
            <PlaceDetails place={locationData} />
          </View>
        )}
      </ScrollView>
    </ActionSheet>
  );
};

export default LocationAboutSheet;
