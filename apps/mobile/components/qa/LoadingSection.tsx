import { Loader } from 'lucide-react-native';
import { Switch } from 'react-native';
import { GroupedRow, GroupedSection, IconSquare } from '~/components/ui/Grouped';
import { useQaSkeletonStore } from '~/store/useQaSkeletonStore';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';
import { COLORS, ROW_INSET } from './shared';

export const LoadingSection = () => {
  const theme = useTheme();
  const forceSkeletons = useQaSkeletonStore((state) => state.forceSkeletons);
  const setForceSkeletons = useQaSkeletonStore((state) => state.setForceSkeletons);

  return (
    <GroupedSection
      header="Loading"
      footer="Keeps Home, menus, foods, places, Nearby and the Changelog on their loading skeletons. Turn it off to see your data again."
    >
      <GroupedRow
        isFirst
        separatorInset={ROW_INSET}
        leading={<IconSquare Icon={Loader} color={COLORS.gray} />}
        title="Always Show Skeletons"
        trailing={
          <Switch
            testID="qa-force-skeletons"
            accessibilityLabel="Always Show Skeletons"
            value={forceSkeletons}
            onValueChange={(on) => {
              haptics.selection();
              setForceSkeletons(on);
            }}
            trackColor={{ true: theme.tint }}
          />
        }
      />
    </GroupedSection>
  );
};
