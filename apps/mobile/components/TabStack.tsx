import { Stack } from 'expo-router';

import { useTheme } from '~/utils/theme';

export const TabStack = () => {
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
    />
  );
};
