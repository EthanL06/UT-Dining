import { SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SheetManager } from 'react-native-actions-sheet';
import { Text } from '~/components/ui/Text';

export type FilterType = 'all' | string;

import { useFiltersStore } from '~/store/useFiltersStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { hasActiveFilters } from '~/utils/filter';
import { haptics } from '~/utils/haptics';
import type { MealTimes } from '~/utils/locations';
import { useTheme } from '~/utils/theme';
import { timeOfDay } from '~/utils/time';

type FilterBarProps = {
  selectedItem: string;
  setSelectedItem: (item: FilterType) => void;
  items: { id: string; title: string }[];
  mealTimes?: MealTimes;
  showFilterButton?: boolean;
  useTimeOfDayDefault?: boolean;
};

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

  const sortedItems = useMemo(() => {
    return [...filterItems].sort((a, b) => {
      const orderA = MEAL_ORDER[a.title as keyof typeof MEAL_ORDER] || 999;
      const orderB = MEAL_ORDER[b.title as keyof typeof MEAL_ORDER] || 999;
      return orderA - orderB;
    });
  }, [filterItems]);

  useEffect(() => {
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

      const matchingItem = filterItems.find((item) => item.title === defaultFilter);

      if (matchingItem) {
        setSelectedItem(matchingItem.id as FilterType);
      } else {
        setSelectedItem(filterItems[0]?.id as FilterType);
      }
    }
  }, [filterItems, selectedItem, useTimeOfDayDefault, setSelectedItem, mealTimes]);

  const onPressItem = (id: FilterType) => {
    if (id === selectedItem) return;
    setSelectedItem(id as FilterType);
    haptics.selection();
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
                <Text variant="subheadline" emphasized={isSelected} numberOfLines={1}>
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
                <Text variant="subheadline" emphasized tone={isSelected ? 'onTint' : 'primary'}>
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

  const hasFilters = hasActiveFilters(filters);

  return (
    <Pressable
      testID="menu-filters-button"
      accessibilityLabel={hasFilters ? 'Filters, on' : 'Filters'}
      accessibilityRole="button"
      onPress={() => SheetManager.show('filters')}
      className="size-9 items-center justify-center rounded-full"
      style={{ backgroundColor: hasFilters ? theme.tint : theme.fill }}
    >
      <SlidersHorizontal size={17} color={hasFilters ? '#FFFFFF' : theme.label} />
    </Pressable>
  );
};
export default FilterBar;
