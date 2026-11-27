import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const usePressScale = (pressedScale = 0.94) => {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return {
    style,
    onPressIn: () => {
      if (reduceMotion) return;
      scale.value = withTiming(pressedScale, { duration: 90 });
    },
    onPressOut: () => {
      if (reduceMotion) return;
      scale.value = withSpring(1, { damping: 12, stiffness: 380, mass: 0.5 });
    },
  };
};
