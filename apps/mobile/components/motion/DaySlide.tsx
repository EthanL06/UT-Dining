import type { ReactNode } from 'react';
import Reanimated, {
  Easing,
  type EntryAnimationsValues,
  type LayoutAnimation,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

const DURATION_MS = 220;
const TRAVEL = 28;

export const DaySlide = ({
  day,
  direction,
  children,
}: {
  day: string;
  direction: 1 | -1;
  children: ReactNode;
}) => {
  const reduceMotion = useReducedMotion();
  const travel = reduceMotion ? 0 : TRAVEL * direction;

  const entering = (_values: EntryAnimationsValues): LayoutAnimation => {
    'worklet';
    const timing = { duration: DURATION_MS, easing: Easing.out(Easing.cubic) };
    return {
      initialValues: { opacity: 0, transform: [{ translateX: travel }] },
      animations: {
        opacity: withTiming(1, timing),
        transform: [{ translateX: withTiming(0, timing) }],
      },
    };
  };

  return (
    <Reanimated.View key={day} entering={entering} testID="meal-plan-day-content">
      {children}
    </Reanimated.View>
  );
};
