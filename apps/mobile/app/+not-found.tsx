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
        <Text className="text-[22px] font-bold" style={{ color: theme.label }}>
          This screen doesn't exist.
        </Text>
        <Link href="/">
          <Text className="text-[17px] font-semibold" style={{ color: theme.tint }}>
            Go to Home
          </Text>
        </Link>
      </View>
    </>
  );
}
