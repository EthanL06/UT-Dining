import { ArrowUp } from 'lucide-react-native';
import { Animated, TouchableOpacity } from 'react-native';

import { useTheme } from '~/utils/theme';

interface ScrollToTopButtonProps {
  visible: boolean;
  animationValue: Animated.Value;
  onPress: () => void;
}

const ScrollToTopButton = ({ visible, animationValue, onPress }: ScrollToTopButtonProps) => {
  const theme = useTheme();
  const scaleAnim = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Animated.View
      style={{
        opacity: animationValue,
        transform: [{ scale: scaleAnim }],
        position: 'absolute',
        bottom: 40,
        right: 20,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <TouchableOpacity
        accessibilityLabel="Scroll to top"
        accessibilityRole="button"
        onPress={onPress}
        className="size-12 items-center justify-center rounded-full"
        style={{
          backgroundColor: theme.card,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
        }}
        activeOpacity={0.7}
      >
        <ArrowUp size={22} color={theme.tint} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default ScrollToTopButton;
