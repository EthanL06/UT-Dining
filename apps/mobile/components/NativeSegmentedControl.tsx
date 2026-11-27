import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useSettingsStore } from '~/store/useSettingsStore';

export const NativeSegmentedControl = ({
  items,
  selectedId,
  onSelect,
  testID,
}: {
  items: { id: string; title: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  testID?: string;
}) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  return (
    <Host
      matchContents={{ vertical: true }}
      colorScheme={isDarkMode ? 'dark' : 'light'}
      style={{ flex: 1 }}
    >
      <Picker
        testID={testID}
        selection={selectedId}
        onSelectionChange={(id: string) => onSelect(id)}
        modifiers={[pickerStyle('segmented')]}
      >
        {items.map((item) => (
          <Text key={item.id} modifiers={[tag(item.id)]}>
            {item.title}
          </Text>
        ))}
      </Picker>
    </Host>
  );
};
