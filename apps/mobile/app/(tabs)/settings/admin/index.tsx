import { router } from 'expo-router';
import { Activity, LogOut, MapPin, RefreshCw } from 'lucide-react-native';
import { AdminScreen } from '~/components/admin/AdminScreen';
import { ActionRow, COLORS } from '~/components/qa/shared';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { useAdminSignOut } from '~/hooks/useAdmin';
import { haptics } from '~/utils/haptics';

const AdminHomeScreen = () => {
  const signOut = useAdminSignOut();

  return (
    <AdminScreen title="Admin" testID="admin-screen">
      {(email) => (
        <>
          <GroupedSection
            header="Tools"
            footer="Changes here go live for everyone the next time their app refreshes."
          >
            <ActionRow
              isFirst
              testID="admin-menus"
              title="Refresh Menus"
              subtitle="Get a hall's menu from UT again"
              Icon={RefreshCw}
              color={COLORS.orange}
              onPress={() => router.push('/settings/admin/menus')}
            />
            <ActionRow
              testID="admin-places"
              title="Edit Places"
              subtitle="Hours, photo and description"
              Icon={MapPin}
              color={COLORS.blue}
              onPress={() => router.push('/settings/admin/places')}
            />
            <ActionRow
              testID="admin-health"
              title="Health"
              subtitle="Menus, app version, crashes and status"
              Icon={Activity}
              color={COLORS.green}
              onPress={() => router.push('/settings/admin/health')}
            />
          </GroupedSection>
          <GroupedSection header="Account" footer={`Signed in as ${email}`}>
            <GroupedRow
              isFirst
              testID="admin-sign-out"
              title="Sign Out"
              titleColor={COLORS.red}
              leading={<LogOut size={20} color={COLORS.red} />}
              onPress={() =>
                signOut.mutate(undefined, {
                  onSuccess: () => {
                    haptics.success();
                    router.replace('/settings');
                  },
                })
              }
            />
          </GroupedSection>
        </>
      )}
    </AdminScreen>
  );
};

export default AdminHomeScreen;
