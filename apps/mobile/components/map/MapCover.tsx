import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '~/utils/theme';

const REVEAL_DELAY_MS = 150;
const REVEAL_MS = 220;
const FALLBACK_REVEAL_MS = 1500;

export const useMapCover = () => {
  const opacity = useSharedValue(1);
  const reveal = () => {
    opacity.value = withDelay(REVEAL_DELAY_MS, withTiming(0, { duration: REVEAL_MS }));
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      if (opacity.value === 1) opacity.value = withTiming(0, { duration: REVEAL_MS });
    }, FALLBACK_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [opacity]);
  return { opacity, reveal };
};

export const MapCover = ({ opacity }: { opacity: SharedValue<number> }) => {
  const theme = useTheme();
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }, style]}
    />
  );
};
