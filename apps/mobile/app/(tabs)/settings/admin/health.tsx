import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { View } from 'react-native';
import { AdminScreen } from '~/components/admin/AdminScreen';
import { AdminError, AdminLoading } from '~/components/admin/AdminStates';
import { RunsSection } from '~/components/admin/RunsSection';
import { COLORS, InfoRow } from '~/components/qa/shared';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { useAdminHealth } from '~/hooks/useAdmin';
import { openStatusPage, useServiceStatus } from '~/hooks/useServiceStatus';
import type { AdminHealth } from '~/services/admin/tools';
import { describeDownloads, formatAgo, formatBytes, toQueryView } from '~/utils/adminView';
import { SERVICE_STATUS_COLORS } from '~/utils/serviceStatus';

const AppSection = () => {
  const embedded = Updates.isEmbeddedLaunch;
  return (
    <GroupedSection header="This App">
      <InfoRow
        isFirst
        label="Version"
        value={`${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`}
      />
      <InfoRow label="Update Channel" value={Updates.channel ?? 'None'} />
      <InfoRow label="Running" value={embedded ? 'Built-in code' : 'Update'} />
      <InfoRow
        label="Update ID"
        value={embedded ? 'None' : (Updates.updateId?.slice(0, 8) ?? 'Unknown')}
      />
      <InfoRow
        label="Published"
        value={embedded || !Updates.createdAt ? 'None' : formatAgo(Updates.createdAt.toISOString())}
      />
      <InfoRow label="Runtime" value={Updates.runtimeVersion ?? 'Unknown'} />
    </GroupedSection>
  );
};

const StatusRow = () => {
  const { data: status, isPending } = useServiceStatus();
  return (
    <GroupedRow
      isFirst
      title="Live Status"
      showChevron
      onPress={openStatusPage}
      trailing={
        <View className="flex-row items-center gap-x-1.5">
          {status && (
            <View
              className="size-2 rounded-full"
              style={{ backgroundColor: SERVICE_STATUS_COLORS[status.health] }}
            />
          )}
          <Text variant="subheadline" tone="secondary">
            {isPending ? 'Checking…' : (status?.label ?? 'Unavailable')}
          </Text>
        </View>
      }
    />
  );
};

const ServerSections = ({ data }: { data: AdminHealth }) => {
  const newestWrite = data.halls
    .map((hall) => hall.lastMenuWrite)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);
  const crashes = data.crashes;
  const downloads = describeDownloads(data.downloads);
  return (
    <>
      <GroupedSection header="Menus">
        <InfoRow
          isFirst
          label="Last Scrape Success"
          value={
            data.scraper.status === 'ready'
              ? formatAgo(data.scraper.lastSuccess?.updatedAt ?? null)
              : 'Not set up'
          }
          valueColor={
            data.scraper.status === 'ready' && !data.scraper.lastSuccess ? COLORS.red : undefined
          }
        />
        <InfoRow label="Last Menu Update" value={formatAgo(newestWrite ?? null)} />
        <InfoRow
          label="Scraper"
          value={
            data.scraper.status === 'ready'
              ? data.scraper.active
                ? 'Running'
                : 'Idle'
              : 'Not set up'
          }
        />
      </GroupedSection>
      <GroupedSection
        header="Crashes"
        footer={
          crashes.status === 'ready'
            ? 'Errors reported by every copy of the app.'
            : 'Add a PostHog key to the admin tools to see crashes.'
        }
      >
        <InfoRow
          isFirst
          label="Last 24 Hours"
          value={crashes.status === 'ready' ? crashes.lastDay.toString() : 'Not set up'}
          valueColor={crashes.status === 'ready' && crashes.lastDay > 0 ? COLORS.red : undefined}
        />
        <InfoRow
          label="Last 7 Days"
          value={crashes.status === 'ready' ? crashes.lastWeek.toString() : 'Not set up'}
        />
      </GroupedSection>
      <GroupedSection header="App Store" footer={downloads.footer}>
        <InfoRow isFirst testID="admin-downloads" label="Total Downloads" value={downloads.value} />
      </GroupedSection>
      <GroupedSection header="Database">
        <InfoRow isFirst label="Size" value={formatBytes(data.database.sizeBytes)} />
        <InfoRow
          label="Active Phones (30 Days)"
          value={data.database.activeDevices?.toString() ?? 'Unknown'}
        />
      </GroupedSection>
      <RunsSection scraper={data.scraper} />
    </>
  );
};

const HealthScreen = () => {
  const health = useAdminHealth();
  const view = toQueryView(health);

  return (
    <AdminScreen
      title="Health"
      testID="admin-health-screen"
      refreshing={health.isRefetching}
      onRefresh={() => health.refetch()}
    >
      {() => (
        <>
          <GroupedSection header="Status">
            <StatusRow />
          </GroupedSection>
          <AppSection />
          {(() => {
            switch (view.status) {
              case 'loading':
                return (
                  <View className="h-40">
                    <AdminLoading />
                  </View>
                );
              case 'error':
                return (
                  <View className="h-48">
                    <AdminError onRetry={() => health.refetch()} />
                  </View>
                );
              case 'ready':
                return <ServerSections data={view.data} />;
            }
          })()}
        </>
      )}
    </AdminScreen>
  );
};

export default HealthScreen;
