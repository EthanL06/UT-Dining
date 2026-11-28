import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
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
  const isFocused = useIsFocused();
  const focused = useRef(isFocused);
  const mapReady = useRef(false);

  const fade = useCallback(
    (delay: number) => {
      opacity.value = withDelay(delay, withTiming(0, { duration: REVEAL_MS }));
    },
    [opacity],
  );

  const reveal = useCallback(() => {
    mapReady.current = true;
    if (focused.current) fade(REVEAL_DELAY_MS);
  }, [fade]);

  useEffect(() => {
    focused.current = isFocused;
    if (!isFocused) return;
    if (mapReady.current) {
      fade(REVEAL_DELAY_MS);
      return;
    }
    const timer = setTimeout(() => fade(0), FALLBACK_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [isFocused, fade]);

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
