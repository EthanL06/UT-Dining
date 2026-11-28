import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { GroupedRow, GroupedSection, StatusDot } from '~/components/ui/Grouped';
import { SkeletonGroupedSection, SkeletonPulse } from '~/components/ui/Skeleton';
import { Text } from '~/components/ui/Text';
import { useCachedMenuData } from '~/hooks/useCachedMenuData';
import { useLocationIdsWithMenus } from '~/hooks/useLocationIdsWithMenus';
import { useNow } from '~/hooks/useNow';
import { useForcedSkeletons } from '~/store/useQaSkeletonStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { displayLocationName } from '~/utils/locationName';
import { isLocationOpenNow } from '~/utils/locationStatus';
import { nearbyPickerView, parseNearbyRoute } from '~/utils/nearbyAlerts';
import { useTheme } from '~/utils/theme';
import { getLocationStatusText } from '~/utils/time';

export default function NearbyScreen() {
  const { halls } = useLocalSearchParams<{ halls?: string }>();
  const theme = useTheme();
  const now = useNow();
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const { data } = useCachedMenuData();
  const withMenus = useLocationIdsWithMenus(getTodayInCentralTime());
  const forceSkeletons = useForcedSkeletons();
  const view = nearbyPickerView(
    forceSkeletons ? undefined : data?.locations,
    parseNearbyRoute(halls),
  );

  const openMenu = (name: string) => {
    router.back();
    router.push({ pathname: '/location/[location]', params: { location: name } });
  };

  const content = () => {
    switch (view.kind) {
      case 'loading':
        return (
          <SkeletonPulse testID="nearby-loading" label="Loading dining halls">
            <SkeletonGroupedSection rows={2} header={false} leading="dot" />
          </SkeletonPulse>
        );
      case 'missing':
        return (
          <Text variant="subheadline" tone="secondary" className="px-5 py-6 text-center">
            These dining halls aren't in the app right now. Check Home for what's open.
          </Text>
        );
      case 'ready':
        return (
          <GroupedSection>
            {view.halls.map((location, index) => {
              const name = location.name ?? '';
              const isOpen = isLocationOpenNow(location, withMenus, now);
              return (
                <GroupedRow
                  key={location.id}
                  testID={`nearby-hall-${index}`}
                  isFirst={index === 0}
                  separatorInset={42}
                  leading={
                    <View className="w-3 items-center">
                      <StatusDot open={isOpen} />
                    </View>
                  }
                  title={displayLocationName(location, useColloquialNames)}
                  subtitle={getLocationStatusText(location, isOpen, now)}
                  showChevron
                  onPress={() => openMenu(name)}
                />
              );
            })}
          </GroupedSection>
        );
      default:
        return view satisfies never;
    }
  };

  return (
    <View style={{ backgroundColor: theme.background }} className="pt-6">
      <View className="mb-4 px-5">
        <Text variant="title2" emphasized>
          You're near
        </Text>
        <Text variant="subheadline" tone="secondary" className="mt-1">
          Pick a dining hall to see what it's serving.
        </Text>
      </View>
      {content()}
    </View>
  );
}
