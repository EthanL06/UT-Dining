import { Check, CircleOff, Gauge, TriangleAlert, WifiOff } from 'lucide-react-native';
import { GroupedRow, GroupedSection, IconSquare } from '~/components/ui/Grouped';
import { useStatusToastStore } from '~/store/useStatusToastStore';
import { haptics } from '~/utils/haptics';
import type { StatusToastPreview } from '~/utils/serviceStatus';
import { useTheme } from '~/utils/theme';
import { COLORS, ROW_INSET } from './shared';

const OPTIONS: {
  preview: StatusToastPreview;
  title: string;
  Icon: typeof Check;
  color: string;
}[] = [
  { preview: 'off', title: 'Live Status', Icon: CircleOff, color: COLORS.gray },
  {
    preview: 'menus-behind',
    title: 'Menus Running Behind',
    Icon: TriangleAlert,
    color: COLORS.yellow,
  },
  { preview: 'slow', title: 'Running Slow', Icon: Gauge, color: COLORS.yellow },
  { preview: 'down', title: 'Down', Icon: WifiOff, color: COLORS.red },
];

export const StatusToastSection = () => {
  const theme = useTheme();
  const preview = useStatusToastStore((state) => state.preview);
  const setPreview = useStatusToastStore((state) => state.setPreview);

  return (
    <GroupedSection
      header="Status Toast"
      footer="Shows the status toast above the tab bar as if UT Dining had this problem. Live Status uses the real status page."
    >
      {OPTIONS.map((option, index) => (
        <GroupedRow
          key={option.preview}
          isFirst={index === 0}
          separatorInset={ROW_INSET}
          testID={`qa-status-toast-${option.preview}`}
          leading={<IconSquare Icon={option.Icon} color={option.color} />}
          title={option.title}
          selected={preview === option.preview}
          trailing={preview === option.preview ? <Check size={18} color={theme.tint} /> : null}
          onPress={() => {
            if (preview === option.preview) return;
            haptics.selection();
            setPreview(option.preview);
          }}
        />
      ))}
    </GroupedSection>
  );
};
