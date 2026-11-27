import { SegmentedControl } from '@expo/ui/community/segmented-control';
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
  const selectedIndex = items.findIndex((item) => item.id === selectedId);

  return (
    <SegmentedControl
      testID={testID}
      style={{ flex: 1 }}
      appearance={isDarkMode ? 'dark' : 'light'}
      values={items.map((item) => item.title)}
      selectedIndex={selectedIndex === -1 ? undefined : selectedIndex}
      onChange={(event) => {
        const item = items[event.nativeEvent.selectedSegmentIndex];
        if (item) onSelect(item.id);
      }}
    />
  );
};
