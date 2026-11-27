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
const TRAVEL = 10;

type Roll = { text: string; previous: string | null; direction: 1 | -1 };

export const RollingText = ({
  text,
  direction,
  className,
  testID,
  ...props
}: Omit<TextProps, 'children'> & { text: string; direction: 1 | -1 }) => {
  const reduceMotion = useReducedMotion();
  const [roll, setRoll] = useState<Roll>({ text, previous: null, direction });
  const progress = useSharedValue(1);

  if (roll.text !== text) {
    setRoll({ text, previous: roll.text, direction });
  }

  useEffect(() => {
    if (roll.previous === null) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) });
  }, [roll, progress]);

  const travel = reduceMotion ? 0 : TRAVEL * roll.direction;
  const incoming = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * travel }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -progress.value * travel }],
  }));

  return (
    <View className={className} style={{ overflow: 'hidden' }}>
      <Reanimated.View style={incoming}>
        <Text {...props} testID={testID}>
          {roll.text}
        </Text>
      </Reanimated.View>
      {roll.previous !== null && (
        <Reanimated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, outgoing]}
        >
          <Text {...props}>{roll.previous}</Text>
        </Reanimated.View>
      )}
    </View>
  );
};
