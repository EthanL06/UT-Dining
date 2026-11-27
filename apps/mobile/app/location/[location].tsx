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
import type { FoodItem } from '~/services/database/database';
import * as schema from '~/services/database/schema';
import { useFiltersStore } from '~/store/useFiltersStore';
import { mealPlanItemId, useMealPlanItems } from '~/store/useMealPlanStore';
import { useMealStripStore } from '~/store/useMealStripStore';
import { getTodayInCentralTime } from '~/utils/date';
import { hasActiveFilters } from '~/utils/filter';
import { addFoodsToMealPlan, favoriteFoods } from '~/utils/foodActions';
import { haptics } from '~/utils/haptics';
import { log } from '~/utils/log';
import { menuEmptyState } from '~/utils/menuList';
import { buildMenuRows, foodMatcher } from '~/utils/menuRows';
import { useTheme } from '~/utils/theme';
import CategoryHeader from './components/CategoryHeader';
import FoodItemRow from './components/FoodItemRow';
import LocationHeader from './components/LocationHeader';
import ScrollToTopButton from './components/ScrollToTopButton';
import SelectionBar from './components/SelectionBar';
import SkeletonItem from './components/SkeletonItem';

const inMealPlan =
  (ids: ReadonlySet<string>, locationName: string, menuName: string) =>
  (food: FoodItem, categoryName: string) =>
    ids.has(mealPlanItemId({ name: food.name ?? '', locationName, menuName, categoryName }));

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
  const { collapsed, toggleCategory, resetExpandedCategories, source, cache } =
    useCategoryExpansion(data);
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

  const favoriteNames = useMemo(
    () => new Set(favorites.map((favorite) => favorite.name)),
    [favorites],
  );
  const mealPlanItems = useMealPlanItems(selectedDate);
  const matches = useMemo(
    () =>
      foodMatcher({
        query: debouncedSearchQuery,
        filters: activeFilters,
        favorites,
        isInMealPlan: inMealPlan(
          new Set(mealPlanItems.map((item) => item.id)),
          location as string,
          selectedMenu ?? '',
        ),
      }),
    [debouncedSearchQuery, activeFilters, favorites, mealPlanItems, location, selectedMenu],
  );
  const rows = useMemo(
    () => buildMenuRows(source, { collapsed, matches }, cache),
    [source, collapsed, matches, cache],
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

  const displayedItems: ListItem[] =
    menuStatus === 'loading' ? skeletonItems : menuStatus === 'error' ? [] : rows;

  const selectedEntries = useMemo(
    () =>
      source.flatMap((category) =>
        category.foods
          .filter((food) => selectedIds.has(food.id))
          .map((food) => ({ food: food.data, category: category.id })),
      ),
    [source, selectedIds],
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
          return (
            <FoodItemRow
              item={item}
              selectedMenu={selectedMenu ?? ''}
              location={location as string}
              date={selectedDate}
              db={db}
              isFavorite={favoriteNames.has(item.data.name ?? '')}
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
      favoriteNames,
      db,
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
        extraData={[favoriteNames, canMealPlan, selecting, selectedIds]}
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
                isFavorite: favoriteNames.has(entry.food.name ?? ''),
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
