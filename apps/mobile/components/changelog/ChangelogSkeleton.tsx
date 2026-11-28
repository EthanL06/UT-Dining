import { View } from 'react-native';
import { SkeletonBar, SkeletonPulse } from '~/components/ui/Skeleton';
import { useTheme } from '~/utils/theme';

const COLLAPSED_TITLE_WIDTHS = ['58%', '46%', '64%'] as const;

export const ChangelogSkeleton = () => {
  const theme = useTheme();
  return (
    <SkeletonPulse testID="changelog-loading" label="Loading release notes" style={{ gap: 10 }}>
      <View
        className="gap-y-3.5 rounded-[18px] px-4 pt-3 pb-[18px]"
        style={{ backgroundColor: theme.card }}
      >
        <View className="min-h-8 flex-row items-center gap-x-2.5">
          <SkeletonBar width={44} height={20} radius={6} />
          <SkeletonBar width={96} height={11} />
        </View>
        <SkeletonBar width="72%" height={20} radius={7} />
        {[0, 1, 2].map((key) => (
          <View key={key} className="flex-row items-start gap-x-3">
            <SkeletonBar width={36} height={36} radius={10} />
            <View className="flex-1 gap-y-2 pt-1">
              <SkeletonBar width="50%" height={14} />
              <SkeletonBar width="88%" height={11} />
            </View>
          </View>
        ))}
      </View>
      {COLLAPSED_TITLE_WIDTHS.map((width) => (
        <View
          key={width}
          className="min-h-14 flex-row items-center gap-x-2.5 rounded-[14px] px-4 py-3"
          style={{ backgroundColor: theme.card }}
        >
          <SkeletonBar width={44} height={20} radius={6} />
          <SkeletonBar width={width} height={14} />
        </View>
      ))}
    </SkeletonPulse>
  );
};
