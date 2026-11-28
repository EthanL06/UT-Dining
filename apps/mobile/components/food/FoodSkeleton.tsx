import { View } from 'react-native';
import { SkeletonBar, SkeletonGroupedSection, SkeletonPulse } from '~/components/ui/Skeleton';
import { useTheme } from '~/utils/theme';

const cardStyle = (color: string) =>
  ({ backgroundColor: color, borderRadius: 22, borderCurve: 'continuous' }) as const;

export const FoodSkeleton = () => {
  const theme = useTheme();
  return (
    <SkeletonPulse testID="food-loading" label="Loading food">
      <View className="gap-y-2.5 px-5 pb-4">
        <SkeletonBar width="70%" height={26} radius={9} />
        <SkeletonBar width="48%" height={13} />
      </View>
      <View
        className="mx-4 mb-2 flex-row items-center justify-between px-4 py-3.5"
        style={cardStyle(theme.card)}
      >
        <View className="gap-y-2.5">
          <SkeletonBar width={110} height={11} />
          <SkeletonBar width={84} height={30} radius={10} />
        </View>
        <SkeletonBar width={30} height={30} radius={15} />
      </View>
      <View className="mx-4 mb-5 flex-row gap-x-2">
        {[0, 1, 2].map((key) => (
          <View key={key} className="flex-1 gap-y-2.5 px-3.5 py-3" style={cardStyle(theme.card)}>
            <SkeletonBar width="60%" height={10} />
            <SkeletonBar width="45%" height={18} radius={7} />
          </View>
        ))}
      </View>
      <SkeletonGroupedSection rows={6} subtitle={false} trailing />
    </SkeletonPulse>
  );
};
