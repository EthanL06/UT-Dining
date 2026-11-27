import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useAdminAccess } from '~/hooks/useAdmin';
import { toQueryView } from '~/utils/adminView';
import { AdminError, AdminLoading } from './AdminStates';

export const AdminGate = ({ children }: { children: (email: string) => ReactNode }) => {
  const access = useAdminAccess();
  const view = toQueryView(access);

  switch (view.status) {
    case 'loading':
      return (
        <View className="h-64">
          <AdminLoading />
        </View>
      );
    case 'error':
      return (
        <View className="h-64">
          <AdminError onRetry={() => access.refetch()} />
        </View>
      );
    case 'ready':
      return view.data.status === 'admin' ? (
        children(view.data.email)
      ) : (
        <Redirect href="/settings" />
      );
  }
};
