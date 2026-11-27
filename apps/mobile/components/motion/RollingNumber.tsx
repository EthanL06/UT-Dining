import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text, type TextProps } from '~/components/ui/Text';

const DURATION_MS = 200;
const TRAVEL = 14;

type Roll = { value: number; previous: number | null; direction: 1 | -1 };

export const RollingNumber = ({
  value,
  style,
  className,
  ...props
}: Omit<TextProps, 'children'> & { value: number }) => {
  const reduceMotion = useReducedMotion();
  const [roll, setRoll] = useState<Roll>({ value, previous: null, direction: 1 });
  const progress = useSharedValue(1);

  if (roll.value !== value) {
    setRoll({ value, previous: roll.value, direction: value > roll.value ? 1 : -1 });
  }

  useEffect(() => {
    if (roll.previous === null || reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) });
  }, [roll, reduceMotion, progress]);

  const direction = roll.direction;
  const incoming = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * TRAVEL * direction }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -progress.value * TRAVEL * direction }],
  }));

  const textStyle = [{ fontVariant: ['tabular-nums' as const] }, style];

  return (
    <View className={className} style={{ overflow: 'hidden', alignItems: 'center' }}>
      <Reanimated.View style={incoming}>
        <Text {...props} style={textStyle}>
          {roll.value}
        </Text>
      </Reanimated.View>
      {roll.previous !== null && !reduceMotion && (
        <Reanimated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[
            { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center' },
            outgoing,
          ]}
        >
          <Text {...props} testID={undefined} style={textStyle}>
            {roll.previous}
          </Text>
        </Reanimated.View>
      )}
    </View>
  );
};
