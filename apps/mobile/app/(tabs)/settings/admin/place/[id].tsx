import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';
import { AdminScreen } from '~/components/admin/AdminScreen';
import { AdminError, AdminLoading } from '~/components/admin/AdminStates';
import { PlaceForm, SaveButton, usePlaceForm } from '~/components/admin/PlaceForm';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { useAdminPlace, useSaveAdminPlace } from '~/hooks/useAdmin';
import type { AdminPlace } from '~/services/admin/tools';
import { toQueryView } from '~/utils/adminView';
import { haptics } from '~/utils/haptics';

const Editor = ({ place }: { place: AdminPlace }) => {
  const form = usePlaceForm(place);
  const save = useSaveAdminPlace(place.id);

  const onSave = () => {
    const result = form.result();
    if (result.kind === 'invalid') {
      haptics.error();
      Alert.alert("Can't save yet", result.message);
      return;
    }
    save.mutate(result.changes, {
      onSuccess: () => {
        haptics.success();
        router.back();
      },
      onError: () => {
        haptics.error();
        Alert.alert("Couldn't save", 'Check your connection and try again.');
      },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: place.name,
          headerRight: () => <SaveButton disabled={save.isPending} onPress={onSave} />,
        }}
      />
      <PlaceForm form={form} />
    </>
  );
};

const PlaceScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = useAdminPlace(id);
  const view = toQueryView(place);

  return (
    <AdminScreen title="Edit Place" testID="admin-place-screen">
      {() => {
        switch (view.status) {
          case 'loading':
            return <AdminLoading />;
          case 'error':
            return (
              <View className="h-64">
                <AdminError onRetry={() => place.refetch()} />
              </View>
            );
          case 'ready':
            return view.data ? (
              <Editor key={view.data.id} place={view.data} />
            ) : (
              <GroupedSection>
                <GroupedRow isFirst title="This place was removed" />
              </GroupedSection>
            );
        }
      }}
    </AdminScreen>
  );
};

export default PlaceScreen;
