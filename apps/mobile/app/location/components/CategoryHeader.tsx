import { ChevronDown } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '~/utils/theme';

interface CategoryHeaderProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const CategoryHeader = React.memo(({ title, isExpanded, onToggle }: CategoryHeaderProps) => {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      onPress={onToggle}
      className="mx-4 mt-5 mb-2 flex-row items-center justify-between px-1"
    >
      <Text className="flex-1 font-bold text-[20px]" style={{ color: theme.label }}>
        {title}
      </Text>
      <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
        <ChevronDown size={19} color={theme.secondaryLabel} />
      </View>
    </Pressable>
  );
});

export default CategoryHeader;
