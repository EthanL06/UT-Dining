import { formatCentralDateKey } from '@ut-dining/core';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { AdminScreen } from '~/components/admin/AdminScreen';
import { AdminError, AdminLoading } from '~/components/admin/AdminStates';
import { RunsSection } from '~/components/admin/RunsSection';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { useAdminHealth, useRefreshHall } from '~/hooks/useAdmin';
import type { AdminHealth, RefreshResult } from '~/services/admin/tools';
import { formatAgo, toQueryView } from '~/utils/adminView';

import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

const REFRESH_ALERTS: Record<Exclude<RefreshResult['status'], 'started'>, [string, string]> = {
  busy: ['Already refreshing', 'Wait for the current refresh to finish, then try again.'],
  unavailable: [
    "Refresh isn't set up",
    'Add the GitHub token and scraper workflow to the admin tools, then try again.',
  ],
  unknown_location: ["Can't refresh this hall", 'Only dining halls with menus can be refreshed.'],
  failed: ["Couldn't start the refresh", "GitHub didn't accept it. Try again in a minute."],
};

const HallRow = ({
  hall,
  isFirst,
  busy,
  onRefresh,
}: {
  hall: AdminHealth['halls'][number];
  isFirst: boolean;
  busy: boolean;
  onRefresh: () => void;
}) => {
  const theme = useTheme();
  const through = hall.latestMenuDate
    ? `Menus through ${formatCentralDateKey(hall.latestMenuDate, { month: 'short', day: 'numeric' })}`
    : 'No menus yet';
  return (
    <GroupedRow
      isFirst={isFirst}
      testID={`admin-hall-${hall.name}`}
      title={hall.name}
      subtitle={`Updated ${formatAgo(hall.lastMenuWrite).toLowerCase()} · ${through}`}
      trailing={
        <Pressable
          accessibilityRole="button"
          testID={`admin-refresh-${hall.name}`}
          disabled={busy}
          onPress={onRefresh}
          className="min-w-[84px] items-center rounded-full px-3 py-1.5"
          style={{ backgroundColor: theme.tintSoft, opacity: busy ? 0.5 : 1 }}
        >
          <Text variant="subheadline" emphasized tone="tint">
            Refresh
          </Text>
        </Pressable>
      }
    />
  );
};

const MenusScreen = () => {
  const health = useAdminHealth();
  const refresh = useRefreshHall();
  const view = toQueryView(health);

  const start = (name: string) =>
    refresh.mutate(name, {
      onSuccess: (result) => {
        if (result.status === 'started') {
          haptics.success();
          return;
        }
        haptics.error();
        Alert.alert(...REFRESH_ALERTS[result.status]);
      },
      onError: () => {
        haptics.error();
        Alert.alert(...REFRESH_ALERTS.failed);
      },
    });

  return (
    <AdminScreen
      title="Refresh Menus"
      testID="admin-menus-screen"
      refreshing={health.isRefetching}
      onRefresh={() => health.refetch()}
    >
      {() => {
        switch (view.status) {
          case 'loading':
            return <AdminLoading />;
          case 'error':
            return (
              <View className="h-64">
                <AdminError onRetry={() => health.refetch()} />
              </View>
            );
          case 'ready': {
            const { scraper, halls } = view.data;
            const active = scraper.status === 'ready' && scraper.active;
            return (
              <>
                <GroupedSection
                  header="Dining Halls"
                  footer={
                    active
                      ? 'A refresh is running. This page updates when it finishes.'
                      : 'Refresh gets the next few days of menus for that hall. It takes about a minute.'
                  }
                >
                  {halls.map((hall, index) => (
                    <HallRow
                      key={hall.id}
                      hall={hall}
                      isFirst={index === 0}
                      busy={active || refresh.isPending}
                      onRefresh={() => start(hall.name)}
                    />
                  ))}
                </GroupedSection>
                {active && (
                  <View className="mb-5 flex-row items-center justify-center gap-x-2">
                    <ActivityIndicator />
                    <Text variant="footnote" tone="secondary">
                      Getting menus from UT…
                    </Text>
                  </View>
                )}
                <RunsSection scraper={scraper} />
              </>
            );
          }
        }
      }}
    </AdminScreen>
  );
};

export default MenusScreen;
