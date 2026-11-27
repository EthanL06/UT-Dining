import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useIsFetching } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RowPosition } from '~/components/FoodComponent';
import { Text } from '~/components/ui/Text';
import type { ListItem } from '~/hooks/useCategoryExpansion';
import { useCategoryExpansion } from '~/hooks/useCategoryExpansion';
import { useDatabase } from '~/hooks/useDatabase';
import { useDebounce } from '~/hooks/useDebounce';
import { useMenuData } from '~/hooks/useMenuData';
import { MENU_SYNC_QUERY_KEY } from '~/hooks/useMenuSync';
import { useMultiSelect } from '~/hooks/useMultiSelect';
import { useScrollToTop } from '~/hooks/useScrollToTop';
import * as schema from '~/services/database/schema';
import { type FiltersState, useFiltersStore } from '~/store/useFiltersStore';
import { mealPlanItemId, useMealPlanItems } from '~/store/useMealPlanStore';
import { useMealStripStore } from '~/store/useMealStripStore';
import { getTodayInCentralTime } from '~/utils/date';
import { filterFoodItems, hasActiveFilters } from '~/utils/filter';
import { addFoodsToMealPlan, favoriteFoods } from '~/utils/foodActions';
import { haptics } from '~/utils/haptics';
import { log } from '~/utils/log';
import { menuEmptyState } from '~/utils/menuList';
import { useTheme } from '~/utils/theme';
import CategoryHeader from './components/CategoryHeader';
import FoodItemRow from './components/FoodItemRow';
import LocationHeader from './components/LocationHeader';
import ScrollToTopButton from './components/ScrollToTopButton';
import SelectionBar from './components/SelectionBar';
import SkeletonItem from './components/SkeletonItem';

const useFilteredItems = (
  flattenedItems: ListItem[],
  debouncedSearchQuery: string,
  filters: FiltersState['filters'],
  favorites: schema.Favorite[],
  mealPlan: { location: string; menu: string; date: string },
) => {
  const mealPlanItems = useMealPlanItems(mealPlan.date);
  return React.useMemo(() => {
    const mealPlanIds = new Set(mealPlanItems.map((planItem) => planItem.id));

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
              result.push({
                ...currentCategory,
              });
              processedCategoryIds.add(currentCategory.id);
            }
            result.push({
              ...item,
              hidden: currentCategory ? !currentCategory.isExpanded : false,
            });
          }
        }
      }
    }

    if (hasActiveFilters(filters)) {
      const filteredCategories = new Set();
      const filteredResult = [];
      let currentCategory = null;

      for (const item of result) {
        if (item.type === 'category_header') {
          currentCategory = item;
        } else if (item.type === 'food_item') {
          const foodItem = item.data;

          const categoryName = item.categoryId;
          const isInMealPlan = (food: typeof foodItem) =>
            mealPlanIds.has(
              mealPlanItemId({
                name: food.name as string,
                locationName: mealPlan.location,
                menuName: mealPlan.menu,
                categoryName,
              }),
            );
          if (filterFoodItems([foodItem], filters, favorites, isInMealPlan).length > 0) {
            if (currentCategory && !filteredCategories.has(currentCategory.id)) {
              filteredResult.push(currentCategory);
              filteredCategories.add(currentCategory.id);
            }
            filteredResult.push(item);
          }
        } else {
          filteredResult.push(item);
        }
      }

      return filteredResult;
    }

    return result;
  }, [
    flattenedItems,
    debouncedSearchQuery,
    filters,
    favorites,
    mealPlanItems,
    mealPlan.location,
    mealPlan.menu,
  ]);
};

const SKELETON_SECTIONS = [4, 3];

const useSkeletonItems = (): ListItem[] => {
  return React.useMemo(() => {
    const items: ListItem[] = [];
    for (const [i, itemCount] of SKELETON_SECTIONS.entries()) {
      items.push({ type: 'skeleton_header', id: `skeleton-header-${i}` } as const);
      for (let j = 0; j < itemCount; j++) {
        const position = j === 0 ? 'first' : j === itemCount - 1 ? 'last' : 'middle';
        items.push({ type: 'skeleton_item', id: `skeleton-item-${i}-${j}-${position}` } as const);
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
  const { location } = useLocalSearchParams<{ location: string }>();
  const [selectedDate, setSelectedDate] = useState(getTodayInCentralTime());
  const {
    menuData: data,
    status: menuStatus,
    selectedMenu,
    setSelectedMenu,
    filters: menuFilters,
  } = useMenuData(location, selectedDate);
  const isSyncing = useIsFetching({ queryKey: MENU_SYNC_QUERY_KEY }) > 0;
  const { toggleCategory, flattenedItems, resetExpandedCategories } = useCategoryExpansion(data);
  const db = useDatabase();
  const {
    selecting,
    selectedIds,
    start: startSelecting,
    toggle: toggleSelected,
    stop: stopSelecting,
  } = useMultiSelect();
  const canMealPlan = selectedDate >= getTodayInCentralTime();

  const posthog = usePostHog();

  useEffect(() => {
    if (location) setLastOpenedLocation(location);
  }, [location, setLastOpenedLocation]);

  const { data: favorites } = useLiveQuery(
    db.select().from(schema.favorites).where(eq(schema.favorites.location_name, location)),
    [location],
  );

  const activeFilters = useFiltersStore((state) => state.filters);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredItems = useFilteredItems(
    flattenedItems,
    debouncedSearchQuery,
    activeFilters,
    favorites,
    { location: location as string, menu: selectedMenu ?? '', date: selectedDate },
  );
  const skeletonItems = useSkeletonItems();

  const listRef = useRef<FlashListRef<ListItem>>(null);
  const { showScrollToTop, scrollButtonAnimation, handleScroll, scrollToTop } =
    useScrollToTop(listRef);

  const handleDateChange = (date: string) => {
    stopSelecting();
    setSelectedDate(date);
  };

  const handleMenuChange = useCallback(
    (menu: string) => {
      stopSelecting();
      setSelectedMenu(menu);
    },
    [stopSelecting, setSelectedMenu],
  );

  useEffect(() => {
    try {
      setSearchQuery('');
      if (resetExpandedCategories) {
        resetExpandedCategories();
      }
    } catch (error) {
      log.error('Error resetting menu state', error);
    }
  }, [resetExpandedCategories]);

  useEffect(() => {
    if (posthog) {
      void posthog.screen(location);
    }
  }, [location, posthog]);

  const displayedItems = useMemo(() => {
    if (menuStatus === 'loading') return skeletonItems;
    if (menuStatus === 'error') return [];
    return debouncedSearchQuery || hasActiveFilters(activeFilters) ? filteredItems : flattenedItems;
  }, [
    menuStatus,
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
              onToggle={() => {
                toggleCategory(item.id);
                haptics.tap();
              }}
            />
          );

        case 'food_item': {
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
              canMealPlan={canMealPlan}
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
          return <SkeletonItem position={item.id.split('-').pop() as RowPosition} />;

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
      canMealPlan,
      selecting,
      selectedIds,
      toggleSelected,
      startSelecting,
    ],
  );

  const EmptyState = useCallback(() => {
    const empty = menuEmptyState({
      menu: menuStatus,
      syncing: isSyncing,
      searching: debouncedSearchQuery !== '',
      filtering: hasActiveFilters(activeFilters),
    });
    if (empty.kind === 'skeleton') return null;
    if (empty.kind === 'syncing') {
      return (
        <View className="mt-12 flex-1 items-center justify-center">
          <ActivityIndicator size="small" />
        </View>
      );
    }
    return (
      <View className="mt-12 flex-1 items-center justify-center">
        <Text variant="headline">{empty.title}</Text>
        <Text variant="subheadline" tone="secondary" className="mt-1">
          {empty.subtitle}
        </Text>
      </View>
    );
  }, [menuStatus, isSyncing, debouncedSearchQuery, activeFilters]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Location' }} />
      <FlashList
        alwaysBounceVertical={false}
        extraData={[favorites, positions, canMealPlan, selecting, selectedIds]}
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
          setSelectedMenu={handleMenuChange}
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
        <SelectionBar
          count={selectedEntries.length}
          calories={selectedCalories}
          canMealPlan={canMealPlan}
          onFavorite={async () => {
            haptics.success();
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
          onAddToMealPlan={() => {
            haptics.success();
            addFoodsToMealPlan(selectedEntries, {
              location,
              menu: selectedMenu ?? '',
              date: selectedDate,
            });
            stopSelecting();
          }}
        />
      ) : (
        <ScrollToTopButton
          visible={showScrollToTop}
          animationValue={scrollButtonAnimation}
          onPress={() => {
            scrollToTop();
            haptics.tap();
          }}
        />
      )}
    </View>
  );
};

export default Location;
