import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { Text } from '~/components/ui/Text';
import { fetchPreviewIndexEntry } from '~/services/qa/previews';
import { consumeReloadReplay, switchUpdateChannel } from '~/services/qa/updates';
import { isDevVariant } from '~/utils/appVariant';
import { isCompatiblePreview, parsePrNumber } from '~/utils/previews';
import { useTheme } from '~/utils/theme';

const loadPreview = async (pr: number): Promise<string> => {
  const preview = await fetchPreviewIndexEntry(pr);
  if (preview && !isCompatiblePreview(preview, Updates.runtimeVersion)) {
    if (preview.buildUrl) await Linking.openURL(preview.buildUrl);
    return `PR #${pr} changed native code. Install its build, then open the link again.`;
  }
  const result = await switchUpdateChannel(preview?.channel ?? `pr-${pr}`);
  return result === 'up-to-date'
    ? `PR #${pr} is already running, or has no preview yet.`
    : `Loading PR #${pr}…`;
};

const isReloadReplay = async (pr: number) => {
  const initialUrl = await Linking.getInitialURL().catch(() => null);
  return parsePrNumber(initialUrl?.match(/preview\/(\d+)/)?.[1]) === pr && consumeReloadReplay();
};

type PreviewState = { status: 'loading' } | { status: 'done'; message: string };

export default function OpenPrPreview() {
  const theme = useTheme();
  const { pr } = useLocalSearchParams<{ pr: string }>();
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    const number = parsePrNumber(pr);
    if (!isDevVariant || !Updates.isEnabled || number === null) {
      router.replace('/');
      return;
    }
    isReloadReplay(number)
      .then((replay) => {
        if (replay) router.replace('/');
        return replay ? null : loadPreview(number);
      })
      .then((message) => {
        if (message !== null) setPreview({ status: 'done', message });
      })
      .catch((error: unknown) =>
        setPreview({
          status: 'done',
          message: error instanceof Error ? error.message : 'Could not load the preview.',
        }),
      );
  }, [pr]);

  return (
    <>
      <Stack.Screen options={{ title: 'PR Preview' }} />
      <View
        testID="pr-preview-screen"
        className="flex-1 items-center justify-center gap-y-4 px-8"
        style={{ backgroundColor: theme.background }}
      >
        {preview.status === 'loading' && <ActivityIndicator color={theme.tint} />}
        <Text variant="body" className="text-center">
          {preview.status === 'loading' ? 'Loading the PR preview…' : preview.message}
        </Text>
        {preview.status === 'done' && (
          <Text
            variant="body"
            color={theme.tint}
            onPress={() => router.replace('/')}
            testID="pr-preview-home"
          >
            Go to Home
          </Text>
        )}
      </View>
    </>
  );
}
