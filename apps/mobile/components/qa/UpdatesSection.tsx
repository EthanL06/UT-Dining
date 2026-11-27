import * as Updates from 'expo-updates';
import { CloudDownload, GitPullRequest, Undo2 } from 'lucide-react-native';
import { Alert } from 'react-native';

import { GroupedSection } from '~/components/ui/Grouped';
import { ActionRow, COLORS, InfoRow, share, useActionStatus } from './shared';

const CHANNEL_HEADER = 'expo-channel-name';

const loadLatestUpdate = async () => {
  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) {
    Alert.alert('Up to date', `Nothing newer on the ${Updates.channel ?? 'current'} channel.`);
    return;
  }
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
};

const formatUpdateTime = (date: Date | null) =>
  date ? date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'unknown';

export const UpdatesSection = () => {
  const { run, detail, isRunning } = useActionStatus();
  const channel = Updates.channel ?? 'none';
  const onPrChannel = channel.startsWith('pr-');

  const switchChannel = (next: string | null) => {
    if (isRunning('channel')) return;
    run('channel', async () => {
      Updates.setUpdateRequestHeadersOverride(next ? { [CHANNEL_HEADER]: next } : null);
      await loadLatestUpdate();
    });
  };

  const loadPrPreview = () =>
    Alert.prompt(
      'Load PR Preview',
      'Enter the pull request number from its Mobile preview comment.',
      (value) => {
        const number = value.trim().replace(/^#/, '');
        if (!/^\d+$/.test(number)) {
          Alert.alert('Not a PR number', 'Enter digits only, like 72.');
          return;
        }
        switchChannel(`pr-${number}`);
      },
      'plain-text',
      '',
      'number-pad',
    );

  if (!Updates.isEnabled) {
    return (
      <GroupedSection
        header="OTA Updates"
        footer="This build has OTA updates turned off: it is a local or CI build. EAS preview builds and builds made with DEV_UPDATES=1 get them."
      >
        <InfoRow isFirst label="Updates" value="Off" />
      </GroupedSection>
    );
  }

  return (
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
          Updates.isEmbeddedLaunch ? 'Embedded JS' : `OTA · ${formatUpdateTime(Updates.createdAt)}`
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
          if (!isRunning('check')) run('check', loadLatestUpdate);
        }}
      />
      <ActionRow
        testID="qa-load-pr-preview"
        title="Load PR Preview"
        subtitle="Runs a pull request's JS on this phone"
        Icon={GitPullRequest}
        color={COLORS.purple}
        detail={detail('channel')}
        onPress={loadPrPreview}
      />
      {onPrChannel && (
        <ActionRow
          testID="qa-back-to-staging"
          title="Back to Staging"
          Icon={Undo2}
          color={COLORS.gray}
          onPress={() => switchChannel(null)}
        />
      )}
    </GroupedSection>
  );
};
