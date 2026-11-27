import { ArrowUp } from 'lucide-react-native';
import { Animated, View } from 'react-native';
import { GlassButton, useLiquidGlass } from '~/components/ui/Glass';
import { SCROLL_TO_TOP_POSITION } from '~/hooks/useScrollToTop';
import { useTheme } from '~/utils/theme';

interface ScrollToTopButtonProps {
  visible: boolean;
  animationValue: Animated.Value;
  onPress: () => void;
}

const ScrollToTopButton = ({ visible, animationValue, onPress }: ScrollToTopButtonProps) => {
  const theme = useTheme();
  const hasGlass = useLiquidGlass();
  const scaleAnim = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: SCROLL_TO_TOP_POSITION.bottom,
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={{
          opacity: animationValue,
          transform: [{ scale: scaleAnim }],
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <GlassButton
          testID="scroll-to-top-button"
          accessibilityLabel="Scroll to top"
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
          <ArrowUp size={22} color={theme.tint} />
        </GlassButton>
      </Animated.View>
    </View>
  );
};

export default ScrollToTopButton;
