import { Stack } from 'expo-router';

import { type Theme, useTheme } from '~/utils/theme';

type TabStackProps = { title: string; headerShown?: boolean };

export const largeTitleHeaderOptions = (theme: Theme) => ({
  headerShown: true,
  headerLargeTitle: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerLargeStyle: { backgroundColor: 'transparent' },
  headerTintColor: theme.tint,
  headerTitleStyle: { color: theme.label },
  headerLargeTitleStyle: { color: theme.label },
});

export const pushedScreenHeaderOptions = (theme: Theme) => ({
  ...largeTitleHeaderOptions(theme),
  headerBackTitle: 'Back',
  headerBackButtonDisplayMode: 'minimal' as const,
});

export const TabStack = ({ title, headerShown = true }: TabStackProps) => {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        ...largeTitleHeaderOptions(theme),
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title, headerShown }} />
    </Stack>
  );
};
