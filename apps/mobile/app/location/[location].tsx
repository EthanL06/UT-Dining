import { useIsFetching } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Stack, useLocalSearchParams, usePreventZoomTransitionDismissal } from 'expo-router';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SearchBarCommands } from 'react-native-screens';
import type { RowPosition } from '~/components/FoodComponent';
import { StaggerIn } from '~/components/motion/StaggerIn';
import { pushedScreenHeaderOptions } from '~/components/TabStack';
import { Text } from '~/components/ui/Text';
import type { ListItem } from '~/hooks/useCategoryExpansion';
import { useCategoryExpansion } from '~/hooks/useCategoryExpansion';
import { useDatabase } from '~/hooks/useDatabase';
import { useDebounce } from '~/hooks/useDebounce';
import { useMenuData } from '~/hooks/useMenuData';
import { MENU_SYNC_QUERY_KEY } from '~/hooks/useMenuSync';
import { useMultiSelect } from '~/hooks/useMultiSelect';
import { useRatingPromptOnMenuView } from '~/hooks/useRatingPromptOnMenuView';
import { SCROLL_TO_TOP_CLEARANCE, useScrollToTop } from '~/hooks/useScrollToTop';
import { analytics } from '~/services/analytics/posthog';
import type { FoodItem } from '~/services/database/database';
import * as schema from '~/services/database/schema';
import { useFiltersStore } from '~/store/useFiltersStore';
import { mealPlanItemId, useMealPlanItems } from '~/store/useMealPlanStore';
import { useMealStripStore } from '~/store/useMealStripStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { hasActiveFilters } from '~/utils/filter';
import { addFoodsToMealPlan, favoriteFoods } from '~/utils/foodActions';
import { haptics } from '~/utils/haptics';
import { useLocationName } from '~/utils/locations';
import { log } from '~/utils/log';
import { menuEmptyState } from '~/utils/menuList';
import { buildMenuRows, foodMatcher } from '~/utils/menuRows';
import { useTheme } from '~/utils/theme';
import CategoryHeader from './components/CategoryHeader';
import FloatingButtons from './components/FloatingButtons';
import FoodItemRow from './components/FoodItemRow';
import LocationHeader, { LocationHeaderButtons } from './components/LocationHeader';
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

const EDGE_SWIPE_WIDTH = 24;

const Location = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  usePreventZoomTransitionDismissal({ unstable_dismissalBoundsRect: { maxX: EDGE_SWIPE_WIDTH } });
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

  useEffect(() => {
    if (location) setLastOpenedLocation(location);
  }, [location, setLastOpenedLocation]);

  const { data: favorites } = useLiveQuery(
    db.select().from(schema.favorites).where(eq(schema.favorites.location_name, location)),
    [location],
  );

  const foodNames = useMemo(
    () => source.flatMap((category) => category.foods.map((food) => food.data.name ?? null)),
    [source],
  );
  useRatingPromptOnMenuView(menuStatus === 'ready', foodNames, favorites);

  const activeFilters = useDeferredValue(useFiltersStore((state) => state.filters));

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchBarRef = useRef<SearchBarCommands>(null);
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const displayName = useLocationName(location, useColloquialNames);
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

  const listRef = useRef<FlatList<ListItem>>(null);
  const {
    showScrollToTop,
    scrollButtonAnimation,
    handleScroll,
    handleScrollBeginDrag,
    handleMomentumScrollEnd,
    scrollToTop,
  } = useScrollToTop(listRef);

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
    analytics.screen(location);
  }, [location]);

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

  const handleToggleCategory = useCallback(
    (id: string) => {
      toggleCategory(id);
      haptics.tap();
    },
    [toggleCategory],
  );

  const handleQueryChange = useCallback(
    (query: string) => {
      resetExpandedCategories();
      setSearchQuery(query);
    },
    [resetExpandedCategories],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      const menuKey = `${selectedMenu ?? ''}|${selectedDate}`;
      switch (item.type) {
        case 'category_header':
          return (
            <StaggerIn index={index} trigger={menuKey}>
              <CategoryHeader
                id={item.id}
                title={item.title}
                isExpanded={item.isExpanded}
                onToggle={handleToggleCategory}
              />
            </StaggerIn>
          );

        case 'food_item': {
          return (
            <StaggerIn index={index} trigger={menuKey}>
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
            </StaggerIn>
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
      handleToggleCategory,
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
    <>
      <Stack.Screen
        options={{
          title: displayName,
          ...pushedScreenHeaderOptions(theme),
          headerRight: () => (
            <LocationHeaderButtons
              location={location}
              selecting={selecting}
              onDoneSelecting={stopSelecting}
            />
          ),
          headerSearchBarOptions: {
            ref: searchBarRef,
            placeholder: 'Search this menu',
            placement: 'stacked',
            autoCapitalize: 'none',
            obscureBackground: false,
            hideNavigationBar: false,
            hideWhenScrolling: false,
            textColor: theme.label,
            tintColor: theme.tint,
            onChangeText: (event) => handleQueryChange(event.nativeEvent.text),
            onFocus: () => {
              stopSelecting();
              setSearching(true);
            },
            onCancelButtonPress: () => {
              setSearching(false);
              handleQueryChange('');
            },
          },
        }}
      />
      <FlatList
        alwaysBounceVertical={false}
        contentInsetAdjustmentBehavior="automatic"
        scrollToOverflowEnabled
        keyboardDismissMode="on-drag"
        extraData={[favoriteNames, canMealPlan, selecting, selectedIds]}
        ref={listRef}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        data={displayedItems}
        keyExtractor={(item) => `${item.type}|${item.id}`}
        removeClippedSubviews
        contentContainerStyle={{
          paddingBottom: insets.bottom + (selecting ? 96 : SCROLL_TO_TOP_CLEARANCE),
        }}
        ListHeaderComponent=<LocationHeader
          location={location}
          selectedMenu={selectedMenu ?? null}
          setSelectedMenu={handleMenuChange}
          filters={menuFilters}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          searching={searching}
        />
        ListEmptyComponent={<EmptyState />}
        renderItem={renderItem}
        keyboardShouldPersistTaps="always"
        style={{ flex: 1, backgroundColor: theme.background }}
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
        <FloatingButtons
          visible={showScrollToTop}
          animationValue={scrollButtonAnimation}
          onScrollToTop={() => {
            scrollToTop();
            haptics.tap();
          }}
          onSearch={() => {
            scrollToTop();
            searchBarRef.current?.focus();
          }}
        />
      )}
    </>
  );
};

export default Location;
