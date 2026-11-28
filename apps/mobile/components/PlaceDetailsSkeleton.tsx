import { View } from 'react-native';
import { SkeletonBar, SkeletonGroupedSection } from '~/components/ui/Skeleton';
import { useTheme } from '~/utils/theme';

export const PlaceDetailsSkeleton = () => {
  const theme = useTheme();
  return (
    <>
      <View className="mb-5">
        <SkeletonBar width={56} height={11} style={{ marginLeft: 36, marginBottom: 9 }} />
        <View
          className="mx-4 gap-y-2.5 px-4 py-3.5"
          style={{ backgroundColor: theme.card, borderRadius: 26, borderCurve: 'continuous' }}
        >
          <SkeletonBar width="92%" height={12} />
          <SkeletonBar width="84%" height={12} />
          <SkeletonBar width="56%" height={12} />
        </View>
      </View>
      <SkeletonGroupedSection rows={3} subtitle={false} trailing />
      <SkeletonGroupedSection rows={2} subtitle={false} leading="icon" />
    </>
  );
};
