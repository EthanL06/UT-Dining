import { router } from 'expo-router';
import { ChefHat, ChevronLeft, Heart, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import FilterBar from '~/components/FilterBar';
import { Text } from '~/components/ui/Text';
import { useDatabase } from '~/hooks/useDatabase';
import { useLocationDetails } from '~/hooks/useLocationDetails';
import { useNow } from '~/hooks/useNow';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { useLocationName, useMealTimes } from '~/utils/locations';
import { type Theme, useTheme } from '~/utils/theme';
import { getLocationStatusText } from '~/utils/time';
import SearchBar from './SearchBar';
import WeekStrip from './WeekStrip';

interface LocationHeaderProps {
  location: string;
  selectedMenu: string | null;
  setSelectedMenu: (menu: string) => void;
  filters: { title: string; id: string }[];
  query: string;
  setQuery: (query: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selecting: boolean;
  onDoneSelecting: () => void;
}

const CircleButton = ({
  testID,
  label,
  onPress,
  theme,
  children,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  theme: Theme;
  children: React.ReactNode;
}) => (
  <Pressable
    testID={testID}
    accessibilityLabel={label}
    accessibilityRole="button"
    hitSlop={6}
    onPress={onPress}
    className="size-11 items-center justify-center rounded-full"
    style={{ backgroundColor: theme.card }}
  >
    {children}
  </Pressable>
);

const LocationHeader = React.memo(
  ({
    location,
    selectedMenu,
    setSelectedMenu,
    filters,
    query,
    setQuery,
    selectedDate,
    onDateChange,
    selecting,
    onDoneSelecting,
  }: LocationHeaderProps) => {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const db = useDatabase();
    const theme = useTheme();
    const { locationData } = useLocationDetails(location);
    const { useColloquialNames } = useSettingsStore();
    const displayName = useLocationName(location, useColloquialNames);
    const mealTimes = useMealTimes(location);

    const now = useNow();
    const isOpen = locationData
      ? isLocationOpenNow(locationData, getLocationIdsWithMenus(db, getTodayInCentralTime()), now)
      : false;
    const status = locationData ? getLocationStatusText(locationData, isOpen, now) : '';

    return (
      <View className="mx-4 mt-2 mb-3 gap-y-4">
        {!isSearchFocused && (
          <>
            <View className="flex-row items-center justify-between">
              <CircleButton
                testID="back-button"
                label="Back"
                theme={theme}
                onPress={() => router.back()}
              >
                <ChevronLeft size={22} color={theme.label} />
              </CircleButton>

              {selecting ? (
                <Pressable
                  testID="select-done-button"
                  accessibilityRole="button"
                  onPress={onDoneSelecting}
                  className="h-11 justify-center rounded-full px-4"
                  style={{ backgroundColor: theme.card }}
                >
                  <Text variant="callout" emphasized tone="tint">
                    Done
                  </Text>
                </Pressable>
              ) : (
                <View className="flex-row gap-x-2">
                  <CircleButton
                    testID="location-favorites-button"
                    label="Favorites"
                    theme={theme}
                    onPress={() => router.push('/favorites')}
                  >
                    <Heart size={19} color={theme.label} />
                  </CircleButton>
                  <CircleButton
                    testID="location-meal-plan-button"
                    label="Meal Plan"
                    theme={theme}
                    onPress={() => router.push('/meal-plan')}
                  >
                    <ChefHat size={19} color={theme.label} />
                  </CircleButton>
                  <CircleButton
                    testID="location-info-button"
                    label="Hours and info"
                    theme={theme}
                    onPress={() => {
                      if (!locationData) return;
                      SheetManager.show('location-about', {
                        payload: { location: locationData },
                      });
                    }}
                  >
                    <Info size={19} color={theme.label} />
                  </CircleButton>
                </View>
              )}
            </View>

            {locationData?.force_close && (
              <View className="rounded-2xl bg-red-600 px-4 py-2.5">
                <Text variant="subheadline" emphasized tone="onTint" className="text-center">
                  Temporarily closed
                </Text>
              </View>
            )}

            <View>
              <Text variant="largeTitle">{displayName}</Text>
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
            </View>

            <WeekStrip selectedDate={selectedDate} onDateChange={onDateChange} />
          </>
        )}

        {filters && filters.length >= 1 && (
          <SearchBar
            query={query}
            setQuery={setQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            isSearchFocused={isSearchFocused}
          />
        )}

        {!isSearchFocused && filters && filters.length >= 1 && (
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
