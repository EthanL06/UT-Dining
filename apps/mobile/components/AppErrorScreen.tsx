import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
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

const restart = () => {
  Updates.reloadAsync().catch((error) => log.error('Failed to restart the app', error));
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
      <Text style={{ color: theme.label }} className="text-center text-xl font-semibold">
        {title}
      </Text>
      <Text style={{ color: theme.secondaryLabel }} className="text-center text-base">
        {message}
      </Text>
      <Pressable
        testID="app-error-retry"
        accessibilityRole="button"
        onPress={onRetry ?? restart}
        style={{ backgroundColor: theme.tint }}
        className="mt-4 rounded-full px-6 py-3"
      >
        <Text className="text-base font-semibold text-white">
          {onRetry ? 'Try again' : 'Restart app'}
        </Text>
      </Pressable>
    </View>
  );
}
