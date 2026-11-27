import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '~/components/ui/Text';

import { useTheme } from '~/utils/theme';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View
        className="flex-1 items-center justify-center gap-y-3 px-8"
        style={{ backgroundColor: theme.background }}
      >
        <Text variant="title2">This screen doesn't exist.</Text>
        <Link href="/">
          <Text variant="headline" tone="tint">
            Go to Home
          </Text>
        </Link>
      </View>
    </>
  );
}
