import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { Text } from '~/components/ui/Text';
import { fetchPrPreviews } from '~/services/qa/previews';
import { switchUpdateChannel } from '~/services/qa/updates';
import { isDevVariant } from '~/utils/appVariant';
import { isCompatiblePreview, parsePrNumber } from '~/utils/previews';
import { useTheme } from '~/utils/theme';

const loadPreview = async (pr: number): Promise<string> => {
  const preview = (await fetchPrPreviews().catch(() => [])).find((item) => item.pr === pr);
  if (preview && !isCompatiblePreview(preview, Updates.runtimeVersion)) {
    if (preview.buildUrl) await Linking.openURL(preview.buildUrl);
    return `PR #${pr} changed native code. Install its build, then open the link again.`;
  }
  const result = await switchUpdateChannel(preview?.channel ?? `pr-${pr}`);
  return result === 'up-to-date'
    ? `PR #${pr} is already running, or has no preview yet.`
    : `Loading PR #${pr}…`;
};

export default function OpenPrPreview() {
  const theme = useTheme();
  const { pr } = useLocalSearchParams<{ pr: string }>();
  const [message, setMessage] = useState('Loading the PR preview…');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const number = parsePrNumber(pr);
    if (!isDevVariant || !Updates.isEnabled || number === null) {
      router.replace('/');
      return;
    }
    loadPreview(number)
      .then(setMessage)
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : 'Could not load the preview.'),
      )
      .finally(() => setDone(true));
  }, [pr]);

  return (
    <>
      <Stack.Screen options={{ title: 'PR Preview' }} />
      <View
        testID="pr-preview-screen"
        className="flex-1 items-center justify-center gap-y-4 px-8"
        style={{ backgroundColor: theme.background }}
      >
        {!done && <ActivityIndicator color={theme.tint} />}
        <Text variant="body" className="text-center">
          {message}
        </Text>
        {done && (
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
