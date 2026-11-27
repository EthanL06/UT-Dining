import { Stack } from 'expo-router';

import { useTheme } from '~/utils/theme';

type TabStackProps = { title: string; headerShown?: boolean };

export const TabStack = ({ title, headerShown = true }: TabStackProps) => {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerTintColor: theme.tint,
        headerTitleStyle: { color: theme.label },
        headerLargeTitleStyle: { color: theme.label },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title, headerShown }} />
    </Stack>
  );
};
