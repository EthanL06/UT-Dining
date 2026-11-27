import { router } from 'expo-router';
import { View } from 'react-native';
import { AdminScreen } from '~/components/admin/AdminScreen';
import { AdminError, AdminLoading } from '~/components/admin/AdminStates';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { Image } from '~/components/ui/Image';
import { useAdminPlaces } from '~/hooks/useAdmin';
import { formatAgo, toQueryView } from '~/utils/adminView';
import { useTheme } from '~/utils/theme';

const Thumbnail = ({ uri }: { uri: string | null }) => {
  const theme = useTheme();
  return (
    <View
      className="size-[36px] overflow-hidden rounded-lg"
      style={{ backgroundColor: theme.fill }}
    >
      {uri && <Image source={{ uri }} className="size-full" contentFit="cover" />}
    </View>
  );
};

const PlacesScreen = () => {
  const places = useAdminPlaces();
  const view = toQueryView(places);

  return (
    <AdminScreen
      title="Edit Places"
      testID="admin-places-screen"
      refreshing={places.isRefetching}
      onRefresh={() => places.refetch()}
    >
      {() => {
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
                <AdminError onRetry={() => places.refetch()} />
              </View>
            );
          case 'ready':
            return (
              <GroupedSection header={`${view.data.length} Places`}>
                {view.data.map((place, index) => (
                  <GroupedRow
                    key={place.id}
                    isFirst={index === 0}
                    testID={`admin-place-${place.name}`}
                    leading={<Thumbnail uri={place.image} />}
                    title={place.name}
                    subtitle={`Edited ${formatAgo(place.updatedAt).toLowerCase()}`}
                    showChevron
                    onPress={() => router.push(`/settings/admin/place/${place.id}`)}
                  />
                ))}
              </GroupedSection>
            );
        }
      }}
    </AdminScreen>
  );
};

export default PlacesScreen;
