import { router, Stack } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EdgeSwipeDismissal } from '~/components/EdgeSwipeDismissal';
import FoodComponent, { type RowPosition } from '~/components/FoodComponent';
import { SkeletonRows } from '~/components/map/SkeletonRows';
import { UndoToast } from '~/components/mealPlan/UndoToast';
import { pushedScreenHeaderOptions } from '~/components/TabStack';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { PressableScale } from '~/components/ui/PressableScale';
import { Text } from '~/components/ui/Text';
import {
  useFavoriteActions,
  useFavoritesList,
  useTodaysFavoriteMenuRows,
} from '~/hooks/useFavorites';
import type * as schema from '~/services/database/schema';
import { useFavoriteOverridesStore } from '~/store/useFavoriteOverridesStore';
import { getTodayInCentralTime } from '~/utils/date';
import { favoriteKey, shownFavorite } from '~/utils/favoriteOverride';
import { favoritesView } from '~/utils/favoritesView';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';
import { timeOfDay } from '~/utils/time';
import { displayNutrient } from '~/utils/utils';

type Favorite = schema.Favorite;
type TodayMatch = { location: string; menu: string };
type Undo = { status: 'idle' } | { status: 'removed'; item: Favorite };

const UNDO_MS = 4000;

const CURRENT_MEAL = { morning: 'Breakfast', afternoon: 'Lunch', evening: 'Dinner' } as const;

const positionOf = (index: number, count: number): RowPosition => {
  if (count === 1) return 'single';
  if (index === 0) return 'first';
  if (index === count - 1) return 'last';
  return 'middle';
};

const matchKey = (name: string, location: string) => `${location}\u001f${name}`;

type MenuRow = { name: string | null; location: string | null; menu: string | null };

const todaysMatches = (rows: MenuRow[]) => {
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
  onRemove,
}: {
  title: string;
  items: Favorite[];
  matches: Map<string, TodayMatch>;
  onRemove: (item: Favorite) => void;
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
            onFavorite={async () => onRemove(item)}
          />
        );
      })}
    </View>
  );
};

const Favorites = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { favorites, loadedAt } = useFavoritesList();
  const favoriteActions = useFavoriteActions();
  const overrides = useFavoriteOverridesStore((state) => state.overrides);
  const [undo, setUndo] = useState<Undo>({ status: 'idle' });

  useEffect(() => {
    if (undo.status !== 'removed') return;
    const timer = setTimeout(() => setUndo({ status: 'idle' }), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const removeFavorite = (item: Favorite) => {
    haptics.remove();
    setUndo({ status: 'removed', item });
    void favoriteActions.set(
      { name: item.name, link: item.link ?? '', nutrition: undefined, allergens: undefined },
      { location: item.location_name, menu: item.menu_name, category: item.category_name },
      false,
    );
  };

  const undoRemove = () => {
    if (undo.status !== 'removed') return;
    haptics.success();
    void favoriteActions.restore(undo.item);
    setUndo({ status: 'idle' });
  };

  const sorted = useMemo(
    () =>
      favorites
        .filter((item) =>
          shownFavorite(true, overrides[favoriteKey(item.name, item.location_name)]),
        )
        .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime()),
    [favorites, overrides],
  );
  const names = useMemo(() => sorted.map((item) => item.name), [sorted]);
  const menuRows = useTodaysFavoriteMenuRows(names, getTodayInCentralTime());
  const matches = useMemo(() => todaysMatches(menuRows), [menuRows]);
  const view = favoritesView(loadedAt, sorted.length);
  const onToday = sorted.filter((item) => matches.has(matchKey(item.name, item.location_name)));
  const notToday = sorted.filter((item) => !matches.has(matchKey(item.name, item.location_name)));

  return (
    <>
      <EdgeSwipeDismissal />
      <Stack.Screen options={{ title: 'Favorites', ...pushedScreenHeaderOptions(theme) }} />
      <OverflowScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        testID="favorites-screen"
        divider={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {view === 'list' && (
          <Text variant="subheadline" tone="secondary" className="px-5 pt-1 pb-4">
            Press and hold a favorite to remove it.
          </Text>
        )}

        {view === 'loading' ? (
          <View className="mx-4">
            <SkeletonRows count={4} testID="favorites-loading" />
          </View>
        ) : view === 'empty' ? (
          <View className="mx-8 mt-12 items-center gap-y-2">
            <Heart size={36} color={theme.tertiaryLabel} />
            <Text variant="headline">No Favorites Yet!</Text>
            <Text variant="subheadline" tone="secondary" className="text-center">
              Press and hold a food on any menu to save it here.
            </Text>
            <PressableScale
              accessibilityRole="button"
              onPress={() => router.dismissTo('/')}
              className="mt-3 h-11 justify-center rounded-full px-5"
              style={{ backgroundColor: theme.tint }}
            >
              <Text variant="subheadline" emphasized tone="onTint">
                Browse Dining Locations
              </Text>
            </PressableScale>
          </View>
        ) : (
          <>
            <FavoriteSection
              title="On a menu today"
              items={onToday}
              matches={matches}
              onRemove={removeFavorite}
            />
            <FavoriteSection
              title="Not today"
              items={notToday}
              matches={matches}
              onRemove={removeFavorite}
            />
          </>
        )}
      </OverflowScrollView>
      {undo.status === 'removed' && (
        <UndoToast
          key={undo.item.id}
          message={`Removed ${undo.item.name}`}
          bottom={insets.bottom + 16}
          onUndo={undoRemove}
        />
      )}
    </>
  );
};

export default Favorites;
