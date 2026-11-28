import { Search, X } from 'lucide-react-native';
import type { Ref } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { Text, TextInput, type TextInputHandle } from '~/components/ui/Text';
import { useTheme } from '~/utils/theme';

type Props = {
  inputRef: Ref<TextInputHandle>;
  query: string;
  onQueryChange: (query: string) => void;
  searching: boolean;
  onFocus: () => void;
  onCancel: () => void;
};

const MenuSearchField = ({
  inputRef,
  query,
  onQueryChange,
  searching,
  onFocus,
  onCancel,
}: Props) => {
  const theme = useTheme();

  return (
    <View className="flex-row items-center gap-x-3">
      <View
        className="h-10 flex-1 flex-row items-center gap-x-2 rounded-full px-3"
        style={{ backgroundColor: theme.fill }}
      >
        <Search size={17} color={theme.secondaryLabel} />
        <TextInput
          testID="menu-search-input"
          ref={inputRef}
          variant="body"
          className="flex-1"
          placeholder="Search this menu"
          autoCapitalize="none"
          autoCorrect={false}
          value={query}
          onChangeText={onQueryChange}
          onFocus={onFocus}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
            onPress={() => onQueryChange('')}
          >
            <X size={16} color={theme.secondaryLabel} />
          </Pressable>
        )}
      </View>
      {searching && (
        <Pressable
          testID="menu-search-cancel"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            Keyboard.dismiss();
            onCancel();
          }}
        >
          <Text variant="body" tone="tint">
            Cancel
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export default MenuSearchField;
