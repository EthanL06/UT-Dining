import { useEffect } from 'react';
import { View } from 'react-native';
import { PressableScale } from '~/components/ui/PressableScale';
import { Text } from '~/components/ui/Text';
import { reloadApp } from '~/services/qa/updates';
import { useSettingsStore } from '~/store/useSettingsStore';
import { log } from '~/utils/log';
import { getTheme } from '~/utils/theme';

interface AppErrorScreenProps {
  title: string;
  message: string;
  error: unknown;
  source: string;
  onRetry?: () => void;
}

export const MIGRATION_ERROR_COPY = {
  title: "Couldn't open the menu cache",
  message: "UT Dining couldn't update the data saved on this phone. Restart the app to try again.",
};

const restart = () => {
  reloadApp().catch((error) => log.error('Failed to restart the app', error));
};

export function AppErrorScreen({ title, message, error, source, onRetry }: AppErrorScreenProps) {
  const theme = getTheme(useSettingsStore((state) => state.isDarkMode));

  useEffect(() => {
    log.error(title, error, { source });
  }, [title, error, source]);

  return (
    <View
      testID="app-error-screen"
      style={{ backgroundColor: theme.background }}
      className="flex-1 items-center justify-center gap-3 px-8"
    >
      <Text variant="title3" className="text-center">
        {title}
      </Text>
      <Text variant="callout" tone="secondary" className="text-center">
        {message}
      </Text>
      <PressableScale
        testID="app-error-retry"
        accessibilityRole="button"
        onPress={onRetry ?? restart}
        style={{ backgroundColor: theme.tint }}
        className="mt-4 rounded-full px-6 py-3"
      >
        <Text variant="callout" emphasized tone="onTint">
          {onRetry ? 'Try again' : 'Restart app'}
        </Text>
      </PressableScale>
    </View>
  );
}
