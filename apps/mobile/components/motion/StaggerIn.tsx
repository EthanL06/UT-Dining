import { type ReactNode, useEffect, useRef } from 'react';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const STEP_MS = 28;
const MAX_STAGGERED = 12;
const DURATION_MS = 240;
const RISE = 8;

export const StaggerIn = ({
  index,
  trigger,
  children,
}: {
  index: number;
  trigger: string;
  children: ReactNode;
}) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(1);
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (lastTrigger.current === trigger) return;
    lastTrigger.current = trigger;
    if (reduceMotion) return;
    progress.value = 0;
    progress.value = withDelay(
      Math.min(index, MAX_STAGGERED) * STEP_MS,
      withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [trigger, index, reduceMotion, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE }],
  }));

  return <Reanimated.View style={style}>{children}</Reanimated.View>;
};
