import { Heart } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Reanimated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const BURST_DOTS = [0, 1, 2, 3, 4, 5];
const BURST_MS = 480;

const BurstDot = ({
  index,
  burst,
  radius,
  color,
}: {
  index: number;
  burst: SharedValue<number>;
  radius: number;
  color: string;
}) => {
  const angle = (index / BURST_DOTS.length) * Math.PI * 2 - Math.PI / 2;
  const style = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : 1 - burst.value,
    transform: [
      { translateX: Math.cos(angle) * radius * burst.value },
      { translateY: Math.sin(angle) * radius * burst.value },
      { scale: 1 - burst.value * 0.6 },
    ],
  }));
  return (
    <Reanimated.View
      style={[
        {
          position: 'absolute',
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

export const HeartPop = ({
  filled,
  size,
  color,
  fillColor,
}: {
  filled: boolean;
  size: number;
  color: string;
  fillColor: string;
}) => {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const burst = useSharedValue(0);
  const wasFilled = useRef(filled);

  useEffect(() => {
    if (wasFilled.current === filled) return;
    wasFilled.current = filled;
    if (reduceMotion) return;
    if (filled) {
      scale.value = withSequence(
        withTiming(0.7, { duration: 80 }),
        withSpring(1, { damping: 7, stiffness: 320, mass: 0.6 }),
      );
      burst.value = 0;
      burst.value = withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.quad) }, () => {
        burst.value = 0;
      });
      return;
    }
    scale.value = withSequence(
      withTiming(0.82, { duration: 90 }),
      withSpring(1, { damping: 14, stiffness: 260 }),
    );
  }, [filled, reduceMotion, scale, burst]);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : (1 - burst.value) * 0.5,
    transform: [{ scale: 0.4 + burst.value * 1.3 }],
  }));

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      pointerEvents="none"
    >
      <Reanimated.View
        style={[
          {
            position: 'absolute',
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size,
            borderWidth: 1.5,
            borderColor: fillColor,
          },
          ringStyle,
        ]}
      />
      {BURST_DOTS.map((dot) => (
        <BurstDot key={dot} index={dot} burst={burst} radius={size * 1.15} color={fillColor} />
      ))}
      <Reanimated.View style={heartStyle}>
        <Heart size={size} color={color} fill={filled ? fillColor : 'transparent'} />
      </Reanimated.View>
    </View>
  );
};
