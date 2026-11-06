import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useIsFetching } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ChefHat, Heart } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RowPosition } from '~/components/FoodComponent';
import type { ListItem } from '~/hooks/useCategoryExpansion';
import { useCategoryExpansion } from '~/hooks/useCategoryExpansion';
import { useDatabase } from '~/hooks/useDatabase';
import { useDebounce } from '~/hooks/useDebounce';
import { useMenuData } from '~/hooks/useMenuData';
import { MENU_SYNC_QUERY_KEY } from '~/hooks/useMenuSync';
import { useScrollToTop } from '~/hooks/useScrollToTop';
import * as schema from '~/services/database/schema';
import { type FiltersState, useFiltersStore } from '~/store/useFiltersStore';
import { useMealStripStore } from '~/store/useMealStripStore';
import { getTodayInCentralTime } from '~/utils/date';
import { filterFoodItems } from '~/utils/filter';
import { addFoodsToMealPlan, favoriteFoods } from '~/utils/foodActions';
import { useTheme } from '~/utils/theme';
import { displayNutrient } from '~/utils/utils';
import CategoryHeader from './components/CategoryHeader';
import FoodItemRow from './components/FoodItemRow';
import LocationHeader from './components/LocationHeader';
import ScrollToTopButton from './components/ScrollToTopButton';
import SkeletonItem from './components/SkeletonItem';

/**
 * Filter items based on search query and user-selected filters
 */
const useFilteredItems = (
  flattenedItems: ListItem[],
  debouncedSearchQuery: string,
  filters: FiltersState['filters'],
  favorites: schema.Favorite[],
) => {
  return React.useMemo(() => {
    // First, filter by search query
    let result = flattenedItems;

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = [];
      const processedCategoryIds = new Set();
      let currentCategory = null;

      for (const item of flattenedItems) {
        if (item.type === 'category_header') {
          currentCategory = { ...item };
        } else if (item.type === 'food_item') {
          const foodName = item.data.name ? item.data.name.toLowerCase() : '';

          if (foodName.includes(query)) {
            if (currentCategory && !processedCategoryIds.has(currentCategory.id)) {
              // Respect the actual expansion state of categories in search results
              result.push({
                ...currentCategory,
              });
              processedCategoryIds.add(currentCategory.id);
            }
            // Respect the category's expansion state for hiding items
            result.push({
              ...item,
              hidden: currentCategory ? !currentCategory.isExpanded : false,
            });
          }
        }
      }
    }

    // Then, apply additional filters (favorites, allergens, dietary)
    if (
      Object.values(filters).some(
        (val) =>
          val === true ||
          (typeof val === 'object' && val !== null && Object.values(val).some((v) => v)),
      )
    ) {
      const filteredCategories = new Set();
      const filteredResult = [];
      let currentCategory = null;

      for (const item of result) {
        if (item.type === 'category_header') {
          // Don't add category headers yet, we'll add them if they have matching items
          currentCategory = item;
        } else if (item.type === 'food_item') {
          // Apply additional filters to food items
          const foodItem = item.data;

          // Use our utility function to check if this item passes all filters
          if (filterFoodItems([foodItem], filters, favorites).length > 0) {
            // Item passed all filters, so add its category header if not already added
            if (currentCategory && !filteredCategories.has(currentCategory.id)) {
              filteredResult.push(currentCategory);
              filteredCategories.add(currentCategory.id);
            }
            // Then add the item itself
            filteredResult.push(item);
          }
        } else {
          // Pass through any other item types
          filteredResult.push(item);
        }
      }

      return filteredResult;
    }

    return result;
  }, [flattenedItems, debouncedSearchQuery, filters, favorites]);
};

/**
 * Generate skeleton items for loading state
 */
const useSkeletonItems = (): ListItem[] => {
  return React.useMemo(() => {
    const items: ListItem[] = [];
    for (let i = 0; i < 2; i++) {
      items.push({ type: 'skeleton_header', id: `skeleton-header-${i}` } as const);
      const itemCount = Math.floor(Math.random() * 2) + 3;
      for (let j = 0; j < itemCount; j++) {
        items.push({ type: 'skeleton_item', id: `skeleton-item-${i}-${j}` } as const);
      }
    }
    return items;
  }, []);
};

const positionsFor = (items: ListItem[]) => {
  const visible = items.filter((item) => !(item.type === 'food_item' && item.hidden));
  const positions = new Map<string, RowPosition>();
  visible.forEach((item, index) => {
    if (item.type !== 'food_item') return;
    const startsGroup = visible[index - 1]?.type !== 'food_item';
    const endsGroup = visible[index + 1]?.type !== 'food_item';
    positions.set(
      item.id,
      startsGroup && endsGroup ? 'single' : startsGroup ? 'first' : endsGroup ? 'last' : 'middle',
    );
  });
  return positions;
};

const Location = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const setLastOpenedLocation = useMealStripStore((state) => state.setLastOpenedLocation);
  // Core state and data
  const { location } = useLocalSearchParams<{ location: string }>();
  const [selectedDate, setSelectedDate] = useState(getTodayInCentralTime());
  const {
    menuData: data,
    loading,
    error,
    selectedMenu,
    setSelectedMenu,
    filters: menuFilters,
  } = useMenuData(location, selectedDate);
  const isSyncing = useIsFetching({ queryKey: MENU_SYNC_QUERY_KEY }) > 0;
  const { toggleCategory, flattenedItems, resetExpandedCategories } = useCategoryExpansion(data);
  const db = useDatabase();
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const posthog = usePostHog();

  useEffect(() => {
    if (location) setLastOpenedLocation(location);
  }, [location, setLastOpenedLocation]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startSelecting = useCallback((id: string) => {
    setSelecting(true);
    setSelectedIds(new Set([id]));
  }, []);

  const stopSelecting = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const { data: favorites } = useLiveQuery(db.select().from(schema.favorites));

  // Get active filters from filters store
  const activeFilters = useFiltersStore((state) => state.filters);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Custom hooks for UI elements
  const filteredItems = useFilteredItems(
    flattenedItems,
    debouncedSearchQuery,
    activeFilters,
    favorites,
  );
  const skeletonItems = useSkeletonItems();

  // Scroll to top functionality
  const listRef = useRef<FlashListRef<ListItem>>(null);
  const { showScrollToTop, scrollButtonAnimation, handleScroll, scrollToTop } =
    useScrollToTop(listRef);

  // Date change handler
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  // Reset search and expanded categories when menu or date changes
  useEffect(() => {
    try {
      setSearchQuery('');
      if (resetExpandedCategories) {
        resetExpandedCategories();
      }
    } catch (error) {
      console.error('Error resetting menu state:', error);
    }
  }, [resetExpandedCategories]);

  useEffect(() => {
    if (posthog) {
      posthog.screen(location);
    }
  }, [location, posthog]);

  // Memoize the displayed items to prevent unnecessary recalculations
  const displayedItems = useMemo(() => {
    if (loading) return skeletonItems;
    if (error) return []; // Return empty array on error, EmptyState will handle the display
    return debouncedSearchQuery ||
      Object.values(activeFilters).some(
        (val) => val === true || (typeof val === 'object' && Object.values(val).some((v) => v)),
      )
      ? filteredItems
      : flattenedItems;
  }, [
    loading,
    error,
    debouncedSearchQuery,
    filteredItems,
    flattenedItems,
    skeletonItems,
    activeFilters,
  ]);

  const positions = useMemo(() => positionsFor(displayedItems), [displayedItems]);

  const selectedEntries = useMemo(
    () =>
      flattenedItems.flatMap((item) =>
        item.type === 'food_item' && selectedIds.has(item.id)
          ? [{ food: item.data, category: item.categoryId }]
          : [],
      ),
    [flattenedItems, selectedIds],
  );
  const selectedCalories = selectedEntries.reduce(
    (total, { food }) => total + (Number.parseFloat(food.nutrition?.calories ?? '') || 0),
    0,
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case 'category_header':
          return (
            <CategoryHeader
              title={item.title}
              isExpanded={item.isExpanded}
              onToggle={async () => {
                toggleCategory(item.id);
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          );

        case 'food_item': {
          // Don't render if marked as hidden
          if (item.hidden) {
            return null;
          }

          return (
            <FoodItemRow
              item={item}
              selectedMenu={selectedMenu ?? ''}
              location={location as string}
              date={selectedDate}
              db={db}
              favorites={favorites}
              position={positions.get(item.id) ?? 'single'}
              selecting={selecting}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelected}
              onSelectMultiple={startSelecting}
            />
          );
        }

        case 'skeleton_header':
          return <SkeletonItem isHeader />;

        case 'skeleton_item':
          return <SkeletonItem />;

        default:
          return null;
      }
    },
    [
      selectedMenu,
      location,
      selectedDate,
      toggleCategory,
      favorites,
      db,
      positions,
      selecting,
      selectedIds,
      toggleSelected,
      startSelecting,
    ],
  );

  // Empty state component
  const EmptyState = useCallback(() => {
    if (loading) return null;
    if (isSyncing) {
      return (
        <View className="mt-12 flex-1 items-center justify-center">
          <ActivityIndicator size="small" />
        </View>
      );
    }

    const subtitle = () => {
      if (error) {
        return 'There was an error loading the menu. Please try again.';
      } else if (debouncedSearchQuery) {
        return 'Try a different search term.';
      } else if (
        Object.values(activeFilters).some(
          (val) => val === true || (typeof val === 'object' && Object.values(val).some((v) => v)),
        )
      ) {
        return 'Try adjusting your filters.';
      }

      return 'Please try again later.';
    };

    const title = error ? 'Error Loading Menu' : 'No items found.';

    return (
      <View className="mt-12 flex-1 items-center justify-center">
        <Text className="font-semibold text-[17px]" style={{ color: theme.label }}>
          {title}
        </Text>
        <Text className="mt-1 text-[15px]" style={{ color: theme.secondaryLabel }}>
          {subtitle()}
        </Text>
      </View>
    );
  }, [loading, isSyncing, error, debouncedSearchQuery, activeFilters, theme]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Location' }} />
      <FlashList
        extraData={[favorites, positions, selecting, selectedIds]}
        ref={listRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        data={displayedItems}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: insets.bottom + (selecting ? 96 : 32) }}
        ListHeaderComponent=<LocationHeader
          location={location}
          selectedMenu={selectedMenu ?? null}
          setSelectedMenu={setSelectedMenu}
          filters={menuFilters}
          query={searchQuery}
          setQuery={(query) => {
            resetExpandedCategories();
            setSearchQuery(query);
          }}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          selecting={selecting}
          onDoneSelecting={stopSelecting}
        />
        ListEmptyComponent={<EmptyState />}
        renderItem={renderItem}
        getItemType={(item) => ('type' in item ? item.type : 'unknown')}
        keyboardShouldPersistTaps="always"
      />

      {selecting ? (
        <View
          className="absolute right-4 left-4 flex-row items-center gap-x-2 rounded-full p-2"
          style={{
            bottom: insets.bottom + 8,
            backgroundColor: theme.card,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Pressable
            testID="select-favorite-button"
            accessibilityLabel="Add selected to favorites"
            accessibilityRole="button"
            disabled={selectedEntries.length === 0}
            onPress={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await favoriteFoods(
                db,
                selectedEntries.map((entry) => ({
                  ...entry,
                  isFavorite: favorites.some((favorite) => favorite.name === entry.food.name),
                })),
                { location, menu: selectedMenu ?? '' },
              );
              stopSelecting();
            }}
            className="size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.fill }}
          >
            <Heart size={20} color={theme.label} />
          </Pressable>
          <Pressable
            testID="select-add-meal-plan-button"
            accessibilityRole="button"
            disabled={selectedEntries.length === 0}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              addFoodsToMealPlan(selectedEntries, { location, menu: selectedMenu ?? '' });
              stopSelecting();
            }}
            className="h-11 flex-1 flex-row items-center justify-center gap-x-2 rounded-full"
            style={{
              backgroundColor: theme.tint,
              opacity: selectedEntries.length === 0 ? 0.5 : 1,
            }}
          >
            <ChefHat size={18} color="#FFFFFF" />
            <Text className="font-semibold text-[15px] text-white">
              {selectedEntries.length === 0
                ? 'Select items'
                : `Add ${selectedEntries.length} to Meal Plan · ${displayNutrient(String(Math.round(selectedCalories)))} kcal`}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollToTopButton
          visible={showScrollToTop}
          animationValue={scrollButtonAnimation}
          onPress={() => {
            scrollToTop();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      )}
    </View>
  );
};

export default Location;
