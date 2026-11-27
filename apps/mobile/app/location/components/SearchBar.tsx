import { Search, X } from 'lucide-react-native';
import { useRef } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { Text, TextInput, type TextInputHandle } from '~/components/ui/Text';

import { useTheme } from '~/utils/theme';

type Props = {
  query: string;
  setQuery: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isSearchFocused: boolean;
};

const SearchBar = ({ query, setQuery, onFocus, onBlur, isSearchFocused }: Props) => {
  const theme = useTheme();
  const inputRef = useRef<TextInputHandle>(null);

  const handleCancel = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setQuery('');
    onBlur?.();
  };

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
          variant="callout"
          className="flex-1"
          placeholder="Search this menu"
          autoCorrect={false}
          value={query}
          onChangeText={setQuery}
          onFocus={onFocus}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}>
            <X size={16} color={theme.secondaryLabel} />
          </Pressable>
        )}
      </View>
      {isSearchFocused && (
        <Pressable accessibilityRole="button" onPress={handleCancel}>
          <Text variant="callout" tone="tint">
            Cancel
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export default SearchBar;
