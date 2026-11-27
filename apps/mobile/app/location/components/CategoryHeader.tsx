import { ChevronDown } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '~/components/ui/Text';

import { useTheme } from '~/utils/theme';

interface CategoryHeaderProps {
  id: string;
  title: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

const CategoryHeader = React.memo(({ id, title, isExpanded, onToggle }: CategoryHeaderProps) => {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      onPress={() => onToggle(id)}
      className="mx-4 mt-5 mb-2 flex-row items-center justify-between px-1"
    >
      <Text variant="title3" className="flex-1">
        {title}
      </Text>
      <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
        <ChevronDown size={19} color={theme.secondaryLabel} />
      </View>
    </Pressable>
  );
});

export default CategoryHeader;
