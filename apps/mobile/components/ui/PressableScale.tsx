import { cssInterop } from 'nativewind';
import {
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { usePressScale } from '~/hooks/usePressScale';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: 'style' });

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  className?: string;
  scaleTo?: number;
};

export const PressableScale = ({
  scaleTo = 0.95,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) => {
  const press = usePressScale(scaleTo);
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event: GestureResponderEvent) => {
        if (!disabled) press.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        press.onPressOut();
        onPressOut?.(event);
      }}
      style={[style, press.style]}
    />
  );
};
