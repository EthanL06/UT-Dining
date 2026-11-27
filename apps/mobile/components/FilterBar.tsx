import * as Haptics from 'expo-haptics';
import { SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';

export type FilterType = 'all' | string;

import { useFiltersStore } from '~/store/useFiltersStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import type { MealTimes } from '~/utils/locations';
import { useTheme } from '~/utils/theme';
import { timeOfDay } from '~/utils/time';

type FilterBarProps = {
  selectedItem: string;
  setSelectedItem: (item: FilterType) => void;
  items: { id: string; title: string }[]; // Accepts dynamic items array
  mealTimes?: MealTimes;
  showFilterButton?: boolean;
  useTimeOfDayDefault?: boolean;
};

// Define the proper meal order
const MEAL_ORDER = {
  Breakfast: 1,
  Lunch: 2,
  Dinner: 3,
};

const FilterBar = ({
  selectedItem,
  setSelectedItem,
  items: filterItems,
  mealTimes,
  showFilterButton = false,
  useTimeOfDayDefault = false,
}: FilterBarProps) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const theme = useTheme();

  // Sort items based on meal order
  const sortedItems = useMemo(() => {
    return [...filterItems].sort((a, b) => {
      const orderA = MEAL_ORDER[a.title as keyof typeof MEAL_ORDER] || 999;
      const orderB = MEAL_ORDER[b.title as keyof typeof MEAL_ORDER] || 999;
      return orderA - orderB;
    });
  }, [filterItems]);

  // When enabled, set default filter based on timeOfDay if none is selected.
  useEffect(() => {
    // If there's only one item, automatically select it
    if (filterItems.length === 1 && !selectedItem) {
      setSelectedItem(filterItems[0].id as FilterType);
      return;
    }

    if (useTimeOfDayDefault && !selectedItem) {
      const tod = mealTimes ? timeOfDay(new Date(), mealTimes) : timeOfDay(new Date());
      let defaultFilter = '';

      if (tod === 'morning') defaultFilter = 'Breakfast';
      else if (tod === 'afternoon') defaultFilter = 'Lunch';
      else if (tod === 'evening') defaultFilter = 'Dinner';

      // Find item with matching title
      const matchingItem = filterItems.find((item) => item.title === defaultFilter);

      if (matchingItem) {
        setSelectedItem(matchingItem.id as FilterType);
      } else {
        // Fallback to first item if no match
        setSelectedItem(filterItems[0]?.id as FilterType);
      }
    }
  }, [filterItems, selectedItem, useTimeOfDayDefault, setSelectedItem, mealTimes]);

  const onPressItem = async (id: FilterType) => {
    setSelectedItem(id as FilterType);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const segmented = sortedItems.length > 1 && sortedItems.length <= 4;

  return (
    <View className="flex-row items-center gap-x-2">
      {segmented ? (
        <View
          className="h-9 flex-1 flex-row rounded-full p-[3px]"
          style={{ backgroundColor: theme.fill }}
        >
          {sortedItems.map((item) => {
            const isSelected = selectedItem === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onPressItem(item.id as FilterType)}
                className="flex-1 items-center justify-center rounded-full"
                style={
                  isSelected
                    ? {
                        backgroundColor: isDarkMode ? '#636366' : '#FFFFFF',
                        shadowColor: '#000',
                        shadowOpacity: 0.12,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 1 },
                      }
                    : undefined
                }
              >
                <Text
                  numberOfLines={1}
                  className={isSelected ? 'font-semibold text-[14px]' : 'font-medium text-[14px]'}
                  style={{ color: theme.label }}
                >
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="gap-x-2"
        >
          {sortedItems.map((item) => {
            const isSelected = selectedItem === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onPressItem(item.id as FilterType)}
                className="h-9 justify-center rounded-full px-3.5"
                style={{ backgroundColor: isSelected ? theme.tint : theme.fill }}
              >
                <Text
                  className={isSelected ? 'font-semibold text-[14px]' : 'font-medium text-[14px]'}
                  style={{ color: isSelected ? '#FFFFFF' : theme.label }}
                >
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {showFilterButton && <FilterButton />}
    </View>
  );
};

const FilterButton = () => {
  const filters = useFiltersStore((state) => state.filters);
  const theme = useTheme();

  const hasValues = <T extends Record<string, boolean>>(item: T): boolean =>
    Array.isArray(item) ? item.length > 0 : Object.values(item).some(Boolean);
  const hasFilters =
    filters.favorites ||
    filters.mealPlan ||
    hasValues(filters.dietary) ||
    hasValues(filters.allergens);

  return (
    <Pressable
      testID="menu-filters-button"
      accessibilityLabel={hasFilters ? 'Filters, on' : 'Filters'}
      accessibilityRole="button"
      onPress={() => {
        SheetManager.show('filters');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      className="size-9 items-center justify-center rounded-full"
      style={{ backgroundColor: hasFilters ? theme.tint : theme.fill }}
    >
      <SlidersHorizontal size={17} color={hasFilters ? '#FFFFFF' : theme.label} />
    </Pressable>
  );
};
export default FilterBar;
