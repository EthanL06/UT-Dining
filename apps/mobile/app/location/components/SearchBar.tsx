import { Search, X } from 'lucide-react-native';
import type React from 'react';
import { useRef } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';

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
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

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
          className="flex-1 text-[16px]"
          style={{ color: theme.label }}
          placeholder="Search this menu"
          placeholderTextColor={theme.secondaryLabel}
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
          <Text className="text-[16px]" style={{ color: theme.tint }}>
            Cancel
          </Text>
        </Pressable>
      )}
    </View>
  );
};

export default SearchBar;
