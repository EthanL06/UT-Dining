import { Info } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import FilterBar from '~/components/FilterBar';
import { Text } from '~/components/ui/Text';
import { useDatabase } from '~/hooks/useDatabase';
import { useLocationDetails } from '~/hooks/useLocationDetails';
import { useNow } from '~/hooks/useNow';
import { getTodayInCentralTime } from '~/utils/date';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { useMealTimes } from '~/utils/locations';
import { useTheme } from '~/utils/theme';
import { getLocationStatusText } from '~/utils/time';
import WeekStrip from './WeekStrip';

interface LocationHeaderProps {
  location: string;
  selectedMenu: string | null;
  setSelectedMenu: (menu: string) => void;
  filters: { title: string; id: string }[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  searching: boolean;
}

export const LocationHeaderButtons = ({
  location,
  selecting,
  onDoneSelecting,
}: {
  location: string;
  selecting: boolean;
  onDoneSelecting: () => void;
}) => {
  const theme = useTheme();
  const { locationData } = useLocationDetails(location);

  if (selecting) {
    return (
      <Pressable
        testID="select-done-button"
        accessibilityRole="button"
        onPress={onDoneSelecting}
        hitSlop={8}
        className="px-1.5"
      >
        <Text variant="callout" emphasized tone="tint">
          Done
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID="location-info-button"
      accessibilityLabel="Hours and info"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        if (!locationData) return;
        void SheetManager.show('location-about', {
          payload: { location: locationData },
        });
      }}
      className="size-9 items-center justify-center"
    >
      <Info size={20} color={theme.label} />
    </Pressable>
  );
};

const LocationHeader = React.memo(
  ({
    location,
    selectedMenu,
    setSelectedMenu,
    filters,
    selectedDate,
    onDateChange,
    searching,
  }: LocationHeaderProps) => {
    const db = useDatabase();
    const theme = useTheme();
    const { locationData } = useLocationDetails(location);
    const mealTimes = useMealTimes(location);

    const now = useNow();
    const isOpen = locationData
      ? isLocationOpenNow(locationData, getLocationIdsWithMenus(db, getTodayInCentralTime()), now)
      : false;
    const status = locationData ? getLocationStatusText(locationData, isOpen, now) : '';

    if (searching) return <View className="h-2" />;

    return (
      <View className="mx-4 mb-3 gap-y-4">
        <View className="gap-y-4">
          {(status !== '' || locationData?.force_close) && (
            <View className="mx-1 gap-y-3">
              {status !== '' && (
                <Text variant="subheadline" tone="secondary">
                  <Text
                    variant="subheadline"
                    emphasized
                    color={isOpen ? theme.tint : theme.secondaryLabel}
                  >
                    {isOpen ? 'Open' : status}
                  </Text>
                  {isOpen ? status.replace(/^Open/, '') : ''}
                  {locationData?.type ? ` · ${locationData.type}` : ''}
                </Text>
              )}
              {locationData?.force_close && (
                <View className="rounded-2xl bg-red-600 px-4 py-2.5">
                  <Text variant="subheadline" emphasized tone="onTint" className="text-center">
                    Temporarily closed
                  </Text>
                </View>
              )}
            </View>
          )}

          <WeekStrip selectedDate={selectedDate} onDateChange={onDateChange} />
        </View>

        {filters && filters.length >= 1 && (
          <FilterBar
            selectedItem={selectedMenu as string}
            setSelectedItem={setSelectedMenu}
            useTimeOfDayDefault={filters.length > 1}
            items={filters}
            mealTimes={mealTimes || undefined}
            showFilterButton
          />
        )}
      </View>
    );
  },
);

export default LocationHeader;
