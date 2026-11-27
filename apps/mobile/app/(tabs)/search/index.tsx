import { and, asc, eq, or, type SQLWrapper, sql } from 'drizzle-orm';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { GroupedRow, GroupedSection, StatusDot } from '~/components/ui/Grouped';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
import { useDatabase } from '~/hooks/useDatabase';
import { useDebounce } from '~/hooks/useDebounce';
import type { DrizzleDB } from '~/services/database/database';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { displayLocationName } from '~/utils/locationName';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { containsPattern } from '~/utils/search';
import { useTheme } from '~/utils/theme';
import { getLocationStatusText, getMinutesUntilClose } from '~/utils/time';

const RESULT_LIMIT = 50;

const contains = (column: SQLWrapper, pattern: string) =>
  sql`${column} LIKE ${pattern} ESCAPE '\\'`;

const searchToday = (db: DrizzleDB, query: string) => {
  const today = getTodayInCentralTime();
  const pattern = containsPattern(query);

  const foods = db
    .select({
      id: schema.food_item.id,
      name: schema.food_item.name,
      calories: schema.nutrition.calories,
      category: schema.menu_category.title,
      menu: schema.menu.name,
      location: schema.location.name,
      locationColloquialName: schema.location.colloquial_name,
    })
    .from(schema.food_item)
    .innerJoin(schema.menu_category, eq(schema.food_item.menu_category_id, schema.menu_category.id))
    .innerJoin(schema.menu, eq(schema.menu_category.menu_id, schema.menu.id))
    .innerJoin(schema.location, eq(schema.menu.location_id, schema.location.id))
    .leftJoin(schema.nutrition, eq(schema.food_item.nutrition_id, schema.nutrition.id))
    .where(and(eq(schema.menu.date, today), contains(schema.food_item.name, pattern)))
    .orderBy(asc(schema.food_item.name))
    .limit(RESULT_LIMIT)
    .all();

  const places = db
    .select()
    .from(schema.location)
    .where(
      or(
        contains(schema.location.name, pattern),
        contains(schema.location.colloquial_name, pattern),
      ),
    )
    .orderBy(asc(schema.location.display_order))
    .all();

  return { foods, places, today };
};

export default function Search() {
  const db = useDatabase();
  const theme = useTheme();
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 150);
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);

  // biome-ignore lint/correctness/useExhaustiveDependencies: search again after a sync replaces the cache
  const results = useMemo(
    () => (debouncedQuery.length > 0 ? searchToday(db, debouncedQuery) : null),
    [db, debouncedQuery, lastSyncedAt],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: today's menus change after a sync
  const locationIdsWithMenus = useMemo(
    () => getLocationIdsWithMenus(db, getTodayInCentralTime()),
    [db, lastSyncedAt],
  );
  const now = new Date();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search',
          headerSearchBarOptions: {
            placeholder: "Search today's menus",
            onChangeText: (event) => setQuery(event.nativeEvent.text),
            hideWhenScrolling: false,
            hideNavigationBar: false,
          },
        }}
      />
      <OverflowScrollView
        divider={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
      >
        {!results ? (
          <Text variant="subheadline" tone="secondary" className="mx-9 mt-2">
            Find any food on today's menus, or any place on campus.
          </Text>
        ) : results.foods.length === 0 && results.places.length === 0 ? (
          <Text variant="subheadline" tone="secondary" className="mx-9 mt-2">
            Nothing on today's menus matches "{debouncedQuery}".
          </Text>
        ) : (
          <>
            {results.places.length > 0 && (
              <GroupedSection header="Places">
                {results.places.map((place, index) => {
                  const name = place.name ?? '';
                  const isOpen = isLocationOpenNow(place, locationIdsWithMenus, now);
                  return (
                    <GroupedRow
                      key={place.id}
                      isFirst={index === 0}
                      separatorInset={37}
                      leading={
                        <StatusDot
                          open={isOpen}
                          closesInMinutes={getMinutesUntilClose(place, now)}
                        />
                      }
                      title={displayLocationName(place, useColloquialNames)}
                      subtitle={getLocationStatusText(place, isOpen, now)}
                      showChevron
                      onPress={() =>
                        router.push({
                          pathname: place.has_menus
                            ? '/location/[location]'
                            : '/location_generic/[location]',
                          params: { location: name },
                        })
                      }
                    />
                  );
                })}
              </GroupedSection>
            )}
            {results.foods.length > 0 && (
              <GroupedSection
                header="On today's menus"
                footer={
                  results.foods.length === RESULT_LIMIT
                    ? `Showing the first ${RESULT_LIMIT}. Type more to narrow it down.`
                    : undefined
                }
              >
                {results.foods.map((food, index) => (
                  <GroupedRow
                    key={food.id}
                    isFirst={index === 0}
                    title={food.name ?? ''}
                    subtitle={`${displayLocationName({ name: food.location, colloquial_name: food.locationColloquialName }, useColloquialNames)} · ${food.menu}`}
                    detail={food.calories ? `${food.calories} kcal` : undefined}
                    showChevron
                    onPress={() =>
                      router.push({
                        pathname: '/food/[food]',
                        params: {
                          food: food.name ?? '',
                          menu: food.menu ?? '',
                          category: food.category ?? '',
                          location: food.location ?? '',
                          favorite: 'false',
                          date: results.today,
                        },
                      })
                    }
                  />
                ))}
              </GroupedSection>
            )}
          </>
        )}
      </OverflowScrollView>
    </>
  );
}
