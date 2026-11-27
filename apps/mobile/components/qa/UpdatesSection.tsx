import { useQuery } from '@tanstack/react-query';
import { formatCentral } from '@ut-dining/core';
import * as Updates from 'expo-updates';
import { CloudDownload, GitPullRequest, Hash, RefreshCcw, Undo2 } from 'lucide-react-native';
import { Alert, Linking } from 'react-native';

import { GroupedSection } from '~/components/ui/Grouped';
import { fetchPrPreviews, PR_PREVIEWS_QUERY_KEY } from '~/services/qa/previews';
import { type LoadResult, loadLatestUpdate, switchUpdateChannel } from '~/services/qa/updates';
import { haptics } from '~/utils/haptics';
import {
  formatPreviewAge,
  isCompatiblePreview,
  type PrPreview,
  parsePrNumber,
  pullRequestUrl,
} from '~/utils/previews';
import { ActionRow, COLORS, InfoRow, share, useActionStatus } from './shared';

const alertIfUpToDate = (result: LoadResult) => {
  if (result === 'up-to-date') {
    Alert.alert('Up to date', `Nothing newer on the ${Updates.channel ?? 'current'} channel.`);
  }
};

const formatUpdateTime = (date: Date | null) =>
  date ? formatCentral(date, { dateStyle: 'short', timeStyle: 'short' }) : 'unknown';

const previewSubtitle = (preview: PrPreview, compatible: boolean) => {
  if (!compatible) return 'Needs a new build. Tap to open its install page';
  const age = formatPreviewAge(preview.updatedAt, Date.now());
  return preview.sha ? `Updated ${age} · ${preview.sha}` : `Updated ${age}`;
};

const usePrPreviews = () =>
  useQuery({
    queryKey: PR_PREVIEWS_QUERY_KEY,
    queryFn: fetchPrPreviews,
    enabled: Updates.isEnabled,
    staleTime: 30_000,
  });

const UpdatesOffSection = () => (
  <GroupedSection
    header="OTA Updates"
    footer="This build has OTA updates turned off: it is a local or CI build. EAS preview builds and builds made with DEV_UPDATES=1 get them."
  >
    <InfoRow isFirst label="Updates" value="Off" />
  </GroupedSection>
);

export const UpdatesSection = () => {
  const { run, detail, isRunning } = useActionStatus();
  const { data: previews, isFetching, error, refetch } = usePrPreviews();
  const channel = Updates.channel ?? 'none';
  const onPrChannel = channel.startsWith('pr-');

  if (!Updates.isEnabled) return <UpdatesOffSection />;

  const switchChannel = (key: string, next: string | null) => {
    if (isRunning(key)) return;
    void run(key, async () => alertIfUpToDate(await switchUpdateChannel(next)));
  };

  const openPreview = (preview: PrPreview) => {
    if (isCompatiblePreview(preview, Updates.runtimeVersion)) {
      switchChannel(`pr-${preview.pr}`, preview.channel);
    } else if (preview.buildUrl) {
      Linking.openURL(preview.buildUrl).catch(() => {});
    } else {
      Alert.alert('Needs a new build', 'This PR changed native code and has no build yet.');
    }
  };

  const openOnGitHub = (preview: PrPreview) => {
    haptics.selection();
    Linking.openURL(pullRequestUrl(preview.pr)).catch(() => {});
  };

  const enterPrNumber = () =>
    Alert.prompt(
      'Load PR Preview',
      'Enter the pull request number from its Mobile preview comment.',
      (value) => {
        const number = parsePrNumber(value);
        if (number === null) {
          Alert.alert('Not a PR number', 'Enter digits only, like 72.');
          return;
        }
        switchChannel('manual', `pr-${number}`);
      },
      'plain-text',
      '',
      'number-pad',
    );

  const listFooter = error
    ? `Could not load the preview list: ${error instanceof Error ? error.message : String(error)}`
    : 'Every open PR that changes the app publishes a preview here. Tap one to run its JS on this phone, or hold it to open the PR on GitHub. Back to Staging returns.';

  return (
    <>
      <GroupedSection
        header="OTA Updates"
        footer="Staging gets every merge into staging. A PR preview stays on until you go back to staging."
      >
        <InfoRow
          isFirst
          testID="qa-update-channel"
          label="Channel"
          value={channel}
          valueColor={onPrChannel ? COLORS.purple : undefined}
        />
        <InfoRow
          label="Running"
          value={
            Updates.isEmbeddedLaunch
              ? 'Embedded JS'
              : `OTA · ${formatUpdateTime(Updates.createdAt)}`
          }
          onPress={Updates.updateId ? () => share(Updates.updateId ?? '') : undefined}
        />
        <InfoRow
          label="Runtime"
          value={Updates.runtimeVersion?.slice(0, 12) ?? 'unknown'}
          onPress={Updates.runtimeVersion ? () => share(Updates.runtimeVersion ?? '') : undefined}
        />
        <ActionRow
          testID="qa-check-update"
          title="Check for Update"
          subtitle="Downloads and restarts if there is one"
          Icon={CloudDownload}
          color={COLORS.blue}
          detail={detail('check')}
          onPress={() => {
            if (!isRunning('check'))
              void run('check', async () => alertIfUpToDate(await loadLatestUpdate()));
          }}
        />
        {onPrChannel && (
          <ActionRow
            testID="qa-back-to-staging"
            title="Back to Staging"
            Icon={Undo2}
            color={COLORS.gray}
            detail={detail('staging')}
            onPress={() => switchChannel('staging', null)}
          />
        )}
      </GroupedSection>
      <GroupedSection header="PR Previews" footer={listFooter}>
        {(previews ?? []).map((preview, index) => {
          const compatible = isCompatiblePreview(preview, Updates.runtimeVersion);
          const key = `pr-${preview.pr}`;
          return (
            <ActionRow
              key={key}
              isFirst={index === 0}
              testID={`qa-preview-${preview.pr}`}
              title={`#${preview.pr} ${preview.title}`}
              subtitle={previewSubtitle(preview, compatible)}
              Icon={GitPullRequest}
              color={compatible ? COLORS.purple : COLORS.gray}
              detail={detail(key) ?? (channel === preview.channel ? 'Running' : undefined)}
              onPress={() => openPreview(preview)}
              onLongPress={() => openOnGitHub(preview)}
            />
          );
        })}
        <ActionRow
          isFirst={(previews ?? []).length === 0}
          testID="qa-refresh-previews"
          title={isFetching ? 'Loading Previews…' : 'Refresh List'}
          subtitle={previews && previews.length === 0 ? 'No open PR previews right now' : undefined}
          Icon={RefreshCcw}
          color={COLORS.blue}
          onPress={() => refetch()}
        />
        <ActionRow
          testID="qa-load-pr-preview"
          title="Enter PR Number"
          Icon={Hash}
          color={COLORS.gray}
          detail={detail('manual')}
          onPress={enterPrNumber}
        />
      </GroupedSection>
    </>
  );
};
