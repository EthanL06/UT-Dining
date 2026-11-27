import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

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
        <Text className="font-bold text-[22px]" style={{ color: theme.label }}>
          This screen doesn't exist.
        </Text>
        <Link href="/">
          <Text className="font-semibold text-[17px]" style={{ color: theme.tint }}>
            Go to Home
          </Text>
        </Link>
      </View>
    </>
  );
}
