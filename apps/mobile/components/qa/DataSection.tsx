import { useQueryClient } from '@tanstack/react-query';
import { Download, Filter, Heart, Inbox, Palette, RefreshCcw, Trash2 } from 'lucide-react-native';

import { GroupedSection } from '~/components/ui/Grouped';
import { useDatabase } from '~/hooks/useDatabase';
import { forceMenuSync } from '~/hooks/useMenuSync';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useFiltersStore } from '~/store/useFiltersStore';
import { useMealPlanStore } from '~/store/useMealPlanStore';
import { useNotificationsStore } from '~/store/useNotificationsStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { ActionRow, COLORS, confirm, useActionStatus } from './shared';

export const DataSection = () => {
  const db = useDatabase();
  const queryClient = useQueryClient();
  const setMenuDayVersions = useDataSyncStore((state) => state.setMenuDayVersions);
  const resetFilters = useFiltersStore((state) => state.resetFilters);
  const setLastVisited = useNotificationsStore((state) => state.setLastVisited);
  const { run, detail, isRunning } = useActionStatus();

  const refreshScreens = () =>
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'menuSync' });

  const syncNow = () => {
    if (isRunning('sync')) return;
    void run('sync', () => forceMenuSync(db, queryClient));
  };

  const redownload = () => {
    if (isRunning('redownload')) return;
    void run('redownload', async () => {
      setMenuDayVersions({});
      await forceMenuSync(db, queryClient);
    });
  };

  const clearFavorites = () =>
    confirm('Clear favorites?', 'Removes every favorite on this phone.', () =>
      run('favorites', async () => {
        await db.delete(schema.favorites).execute();
        await refreshScreens();
      }),
    );

  const clearMealPlans = () =>
    confirm('Clear meal plans?', 'Removes the meal plan for every day.', () =>
      run('mealPlans', () => useMealPlanStore.setState({ plans: {} })),
    );

  const resetDisplay = () =>
    run('display', () =>
      useSettingsStore.setState({ useColloquialNames: false, isColorBlindMode: false }),
    );

  return (
    <GroupedSection header="Data">
      <ActionRow
        isFirst
        testID="qa-force-sync"
        title="Force Menu Sync"
        subtitle="Fetches only days whose version changed"
        Icon={RefreshCcw}
        color={COLORS.green}
        detail={detail('sync')}
        onPress={syncNow}
      />
      <ActionRow
        testID="qa-redownload-menus"
        title="Re-download All Menus"
        subtitle="Forgets cached versions, then syncs"
        Icon={Download}
        color={COLORS.green}
        detail={detail('redownload')}
        onPress={redownload}
      />
      <ActionRow
        testID="qa-clear-favorites"
        title="Clear Favorites"
        Icon={Heart}
        color={COLORS.red}
        detail={detail('favorites')}
        onPress={clearFavorites}
      />
      <ActionRow
        testID="qa-clear-meal-plans"
        title="Clear All Meal Plans"
        Icon={Trash2}
        color={COLORS.red}
        detail={detail('mealPlans')}
        onPress={clearMealPlans}
      />
      <ActionRow
        testID="qa-reset-filters"
        title="Reset Filters"
        Icon={Filter}
        color={COLORS.blue}
        detail={detail('filters')}
        onPress={() => run('filters', resetFilters)}
      />
      <ActionRow
        testID="qa-reset-display"
        title="Reset Display Settings"
        subtitle="Colorblind and colloquial names off"
        Icon={Palette}
        color={COLORS.indigo}
        detail={detail('display')}
        onPress={resetDisplay}
      />
      <ActionRow
        testID="qa-mark-notifications-unread"
        title="Mark Notifications Unread"
        subtitle="Brings the tab badge back"
        Icon={Inbox}
        color={COLORS.gray}
        detail={detail('unread')}
        onPress={() => run('unread', () => setLastVisited(0))}
      />
    </GroupedSection>
  );
};
