import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl } from 'react-native';
import { pushedScreenHeaderOptions } from '~/components/TabStack';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { useTheme } from '~/utils/theme';
import { AdminGate } from './AdminGate';

export const AdminScreen = ({
  title,
  testID,
  refreshing,
  onRefresh,
  headerRight,
  children,
}: {
  title: string;
  testID: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerRight?: () => ReactNode;
  children: (email: string) => ReactNode;
}) => {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen
        options={{
          ...pushedScreenHeaderOptions(theme),
          title,
          headerLargeTitle: false,
          headerRight,
        }}
      />
      <OverflowScrollView
        divider={false}
        testID={testID}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing === true} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <AdminGate>{children}</AdminGate>
      </OverflowScrollView>
    </>
  );
};
