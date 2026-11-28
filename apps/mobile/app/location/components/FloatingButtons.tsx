import { ArrowUp, Search } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { GlassButton, useLiquidGlass } from '~/components/ui/Glass';
import { SCROLL_TO_TOP_POSITION } from '~/hooks/useScrollToTop';
import { useTheme } from '~/utils/theme';

interface FloatingButtonsProps {
  visible: boolean;
  animationValue: Animated.Value;
  onScrollToTop: () => void;
  onSearch: () => void;
}

const FloatingButton = ({
  testID,
  label,
  onPress,
  children,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) => {
  const theme = useTheme();
  const hasGlass = useLiquidGlass();

  return (
    <GlassButton
      testID={testID}
      accessibilityLabel={label}
      size={SCROLL_TO_TOP_POSITION.size}
      fallbackColor={theme.card}
      onPress={onPress}
      style={
        !hasGlass && {
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
        }
      }
    >
      {children}
    </GlassButton>
  );
};

const FloatingButtons = ({
  visible,
  animationValue,
  onScrollToTop,
  onSearch,
}: FloatingButtonsProps) => {
  const theme = useTheme();
  const scale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });
  const animatedStyle = {
    opacity: animationValue,
    transform: [{ scale }],
    pointerEvents: visible ? ('auto' as const) : ('none' as const),
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 left-0 flex-row items-center justify-center"
      style={{ bottom: SCROLL_TO_TOP_POSITION.bottom }}
    >
      <Animated.View style={animatedStyle}>
        <FloatingButton testID="scroll-to-top-button" label="Scroll to top" onPress={onScrollToTop}>
          <ArrowUp size={22} color={theme.label} />
        </FloatingButton>
      </Animated.View>
      <Animated.View style={[animatedStyle, { position: 'absolute', right: 20 }]}>
        <FloatingButton testID="menu-search-button" label="Search this menu" onPress={onSearch}>
          <Search size={21} color={theme.label} />
        </FloatingButton>
      </Animated.View>
    </View>
  );
};

export default FloatingButtons;
