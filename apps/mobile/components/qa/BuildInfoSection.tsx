import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';
import { View } from 'react-native';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { useServiceStatus } from '~/hooks/useServiceStatus';
import { getOrCreateDeviceId } from '~/services/device/deviceId';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { isDevVariant } from '~/utils/appVariant';
import { describeBackend } from '~/utils/backend';
import { SERVICE_STATUS_COLORS } from '~/utils/serviceStatus';
import { useTheme } from '~/utils/theme';
import { formatTimeSinceSync } from '~/utils/time';
import { COLORS, InfoRow, share } from './shared';

export const BuildInfoSection = () => {
  const theme = useTheme();
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const menuDayVersions = useDataSyncStore((state) => state.menuDayVersions);
  const { data: status, refetch } = useServiceStatus();
  const backend = describeBackend(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const deviceId = getOrCreateDeviceId();
  const gitCommit = Constants.expoConfig?.extra?.gitCommit as string | null | undefined;
  const cachedDays = Object.keys(menuDayVersions).sort();

  const backendLabel = {
    dev: 'Dev',
    prod: 'PRODUCTION',
    local: 'Local',
    unknown: 'Unknown',
  }[backend.kind];

  const info = [
    `Variant: ${isDevVariant ? 'Dev' : 'App Store'}${__DEV__ ? ' (Metro)' : ''}`,
    `Bundle: ${Application.applicationId}`,
    `Version: ${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`,
    `Commit: ${gitCommit ?? 'unknown'}`,
    `JS: ${Updates.isEmbeddedLaunch ? 'embedded' : (Updates.updateId ?? 'unknown')}`,
    `Backend: ${backendLabel} ${backend.host}`,
    `Device ID: ${deviceId}`,
    `Device: ${Device.modelName ?? 'unknown'}, iOS ${Device.osVersion ?? '?'}`,
  ].join('\n');

  return (
    <GroupedSection header="Build & Environment" footer="Tap a row to share or copy it.">
      <InfoRow isFirst label="Variant" value={isDevVariant ? 'Dev' : 'App Store'} />
      <InfoRow
        label="Version"
        value={`${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`}
      />
      <InfoRow
        label="Commit"
        value={gitCommit ?? 'unknown'}
        onPress={gitCommit ? () => share(gitCommit) : undefined}
      />
      <InfoRow label="JS Bundle" value={Updates.isEmbeddedLaunch ? 'Embedded' : 'OTA update'} />
      <InfoRow
        testID="qa-backend"
        label="Backend"
        value={`${backendLabel} · ${backend.host.split('.')[0]}`}
        valueColor={backend.kind === 'prod' ? COLORS.red : undefined}
        onPress={() => share(backend.host)}
      />
      <InfoRow
        label="Last Sync"
        value={formatTimeSinceSync(
          lastSyncedAt === null ? Infinity : Math.max(0, Date.now() - lastSyncedAt),
        )}
      />
      <InfoRow
        label="Cached Days"
        value={cachedDays.length > 0 ? `${cachedDays[0]} to ${cachedDays.at(-1)}` : 'None'}
      />
      <GroupedRow
        title="Service Status"
        onPress={() => refetch()}
        trailing={
          <View className="flex-row items-center gap-x-1.5">
            {status && (
              <View
                className="size-2 rounded-full"
                style={{ backgroundColor: SERVICE_STATUS_COLORS[status.health] }}
              />
            )}
            <Text variant="subheadline" tone="secondary">
              {status?.label ?? 'Unavailable'}
            </Text>
          </View>
        }
      />
      <InfoRow label="Device ID" value={deviceId.slice(0, 8)} onPress={() => share(deviceId)} />
      <GroupedRow
        testID="qa-copy-build-info"
        title="Share All Build Info"
        titleColor={theme.tint}
        onPress={() => share(info)}
      />
    </GroupedSection>
  );
};
