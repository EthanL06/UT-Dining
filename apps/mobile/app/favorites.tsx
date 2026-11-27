import { and, eq, inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack } from 'expo-router';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FoodComponent, { type RowPosition } from '~/components/FoodComponent';
import { Text } from '~/components/ui/Text';
import { useDatabase } from '~/hooks/useDatabase';
import type { DrizzleDB } from '~/services/database/database';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { getTodayInCentralTime } from '~/utils/date';
import { toggleFavoriteForFood } from '~/utils/foodActions';
import { useTheme } from '~/utils/theme';
import { timeOfDay } from '~/utils/time';
import { displayNutrient } from '~/utils/utils';

type Favorite = schema.Favorite;
type TodayMatch = { location: string; menu: string };

const CURRENT_MEAL = { morning: 'Breakfast', afternoon: 'Lunch', evening: 'Dinner' } as const;

const positionOf = (index: number, count: number): RowPosition => {
  if (count === 1) return 'single';
  if (index === 0) return 'first';
  if (index === count - 1) return 'last';
  return 'middle';
};

const matchKey = (name: string, location: string) => `${location}\u001f${name}`;

const todaysMatches = (db: DrizzleDB, names: string[]) => {
  if (names.length === 0) return new Map<string, TodayMatch>();
  const rows = db
    .select({
      name: schema.food_item.name,
      location: schema.location.name,
      menu: schema.menu.name,
    })
    .from(schema.food_item)
    .innerJoin(schema.menu_category, eq(schema.food_item.menu_category_id, schema.menu_category.id))
    .innerJoin(schema.menu, eq(schema.menu_category.menu_id, schema.menu.id))
    .innerJoin(schema.location, eq(schema.menu.location_id, schema.location.id))
    .where(
      and(eq(schema.menu.date, getTodayInCentralTime()), inArray(schema.food_item.name, names)),
    )
    .all();
  const currentMeal = CURRENT_MEAL[timeOfDay(new Date())];
  const matches = new Map<string, TodayMatch>();
  const ordered = [...rows].sort(
    (a, b) => Number(b.menu === currentMeal) - Number(a.menu === currentMeal),
  );
  for (const row of ordered) {
    const key = matchKey(row.name ?? '', row.location ?? '');
    if (row.name && !matches.has(key)) {
      matches.set(key, { location: row.location ?? '', menu: row.menu ?? '' });
    }
  }
  return matches;
};

const FavoriteSection = ({
  title,
  items,
  matches,
  db,
}: {
  title: string;
  items: Favorite[];
  matches: Map<string, TodayMatch>;
  db: DrizzleDB;
}) => {
  if (items.length === 0) return null;

  return (
    <View className="mb-5">
      <Text variant="footnote" tone="secondary" className="mx-9 mb-1.5">
        {title}
      </Text>
      {items.map((item, index) => {
        const match = matches.get(matchKey(item.name, item.location_name));
        const calories = item.calories ? `${displayNutrient(item.calories)} kcal` : null;
        const subtitle = match
          ? [match.location, match.menu, calories].filter(Boolean).join(' · ')
          : [`Last at ${item.location_name}`, calories].filter(Boolean).join(' · ');
        return (
          <FoodComponent
            key={item.id}
            food={{
              name: item.name,
              link: item.link ?? '',
              nutrition: undefined,
              allergens: undefined,
            }}
            categoryName={item.category_name}
            location={item.location_name}
            selectedMenu={item.menu_name}
            position={positionOf(index, items.length)}
            subtitle={subtitle}
            canMealPlan={false}
            isFavorite
            isFavoriteScreen
            onFavorite={async (food) => {
              await toggleFavoriteForFood(db, food, {
                location: item.location_name,
                menu: item.menu_name,
                category: item.category_name,
              });
            }}
          />
        );
      })}
    </View>
  );
};

const Favorites = () => {
  const db = useDatabase();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const { data: favorites } = useLiveQuery(db.select().from(schema.favorites));

  const sorted = useMemo(
    () =>
      [...favorites].sort(
        (a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime(),
      ),
    [favorites],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: today's menus change after a sync
  const matches = useMemo(
    () =>
      todaysMatches(
        db,
        sorted.map((item) => item.name),
      ),
    [db, sorted, lastSyncedAt],
  );
  const onToday = sorted.filter((item) => matches.has(matchKey(item.name, item.location_name)));
  const notToday = sorted.filter((item) => !matches.has(matchKey(item.name, item.location_name)));

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Favorites', headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="px-4 pt-2">
          <Pressable
            testID="back-button"
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => router.back()}
            className="size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.card }}
          >
            <ChevronLeft size={22} color={theme.label} />
          </Pressable>
        </View>
        <Text variant="largeTitle" testID="favorites-title" className="px-5 pt-3 pb-1">
          Favorites
        </Text>
        {sorted.length > 0 && (
          <Text variant="subheadline" tone="secondary" className="px-5 pb-4">
            Swipe left on a favorite to remove it.
          </Text>
        )}

        {sorted.length === 0 ? (
          <View className="mx-8 mt-12 items-center gap-y-2">
            <Heart size={36} color={theme.tertiaryLabel} />
            <Text variant="headline">No Favorites Yet!</Text>
            <Text variant="subheadline" tone="secondary" className="text-center">
              Press and hold a food on any menu, or swipe left on it, to save it here.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.dismissTo('/')}
              className="mt-3 h-11 justify-center rounded-full px-5"
              style={{ backgroundColor: theme.tint }}
            >
              <Text variant="subheadline" emphasized tone="onTint">
                Browse Dining Locations
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FavoriteSection title="On a menu today" items={onToday} matches={matches} db={db} />
            <FavoriteSection title="Not today" items={notToday} matches={matches} db={db} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default Favorites;
