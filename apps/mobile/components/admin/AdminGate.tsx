import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useAdminAccess } from '~/hooks/useAdmin';
import { toQueryView } from '~/utils/adminView';
import { AdminError, AdminLoading } from './AdminStates';

export const AdminGate = ({ children }: { children: (email: string) => ReactNode }) => {
  const access = useAdminAccess();
  const view = toQueryView(access);

  switch (view.status) {
    case 'loading':
      return <AdminLoading />;
    case 'error':
      return <AdminError onRetry={() => access.refetch()} />;
    case 'ready':
      return view.data.status === 'admin' ? (
        children(view.data.email)
      ) : (
        <Redirect href="/settings" />
      );
  }
};
