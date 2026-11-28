import { View } from 'react-native';
import { SkeletonBar, SkeletonGroupedSection, SkeletonPulse } from '~/components/ui/Skeleton';
import { useTheme } from '~/utils/theme';

const CHIP_WIDTHS = [44, 92, 104, 72, 88];

const HomeHeaderSkeleton = () => {
  const theme = useTheme();
  return (
    <>
      <SkeletonBar
        width={48}
        height={48}
        radius={12}
        style={{ marginLeft: 16, marginBottom: 16 }}
      />
      <SkeletonBar
        width="62%"
        height={30}
        radius={10}
        style={{ marginLeft: 20, marginBottom: 10 }}
      />
      <SkeletonBar width="40%" height={14} style={{ marginLeft: 20, marginBottom: 18 }} />
      <View className="mx-4 mb-3 flex-row gap-x-2">
        {[0, 1].map((key) => (
          <View
            key={key}
            className="flex-1 flex-row items-center gap-x-2.5 px-4 py-3.5"
            style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
          >
            <SkeletonBar width={20} height={20} radius={6} />
            <SkeletonBar width="55%" height={14} />
          </View>
        ))}
      </View>
    </>
  );
};

export const HomeSkeleton = ({ withHeader = false }: { withHeader?: boolean }) => (
  <SkeletonPulse testID="home-loading" label="Loading dining locations">
    {withHeader && <HomeHeaderSkeleton />}
    <View className="flex-row gap-x-2 overflow-hidden px-4 pb-4">
      {CHIP_WIDTHS.map((width) => (
        <SkeletonBar key={width} width={width} height={34} />
      ))}
    </View>
    <SkeletonGroupedSection rows={5} leading="dot" />
    <SkeletonGroupedSection rows={3} leading="dot" offset={5} />
  </SkeletonPulse>
);
