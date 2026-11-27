import { Check, type LucideIcon } from 'lucide-react-native';

import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

export type Choice = { id: string; label: string; icon: LucideIcon };

const ChoiceList = ({
  choices,
  isSelected,
  onToggle,
  footer,
}: {
  choices: Choice[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  footer?: string;
}) => {
  const theme = useTheme();

  return (
    <OverflowScrollView containerClassName="flex-1" showsVerticalScrollIndicator={false}>
      <GroupedSection footer={footer}>
        {choices.map(({ id, label, icon: Icon }, index) => {
          const selected = isSelected(id);
          return (
            <GroupedRow
              key={id}
              testID={`onboarding-choice-${id}`}
              isFirst={index === 0}
              separatorInset={50}
              leading={<Icon size={20} color={selected ? theme.tint : theme.secondaryLabel} />}
              title={label}
              titleColor={selected ? theme.tint : theme.label}
              trailing={
                selected ? <Check size={20} color={theme.tint} strokeWidth={2.5} /> : undefined
              }
              selected={selected}
              onPress={() => {
                haptics.selection();
                onToggle(id);
              }}
            />
          );
        })}
      </GroupedSection>
    </OverflowScrollView>
  );
};

export default ChoiceList;
