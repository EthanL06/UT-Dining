import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChefHat, ChevronLeft, Heart, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import FilterBar from '~/components/FilterBar';
import { useDatabase } from '~/hooks/useDatabase';
import { useLocationDetails } from '~/hooks/useLocationDetails';
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
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
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

    const now = new Date();
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
                  <Text className="font-semibold text-[16px]" style={{ color: theme.tint }}>
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
                <Text className="text-center font-bold text-[15px] text-white">
                  Temporarily closed
                </Text>
              </View>
            )}

            <View>
              <Text className="font-bold text-[34px] leading-[41px]" style={{ color: theme.label }}>
                {displayName}
              </Text>
              {status !== '' && (
                <Text className="text-[15px]" style={{ color: theme.secondaryLabel }}>
                  <Text
                    className="font-semibold"
                    style={{ color: isOpen ? theme.tint : theme.secondaryLabel }}
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
