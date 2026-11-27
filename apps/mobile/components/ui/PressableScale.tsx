import {
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { usePressScale } from '~/hooks/usePressScale';

export type PressableScaleProps = PressableProps & {
  className?: string;
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export const PressableScale = ({
  scaleTo = 0.95,
  containerStyle,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) => {
  const press = usePressScale(scaleTo);
  return (
    <Reanimated.View style={[containerStyle, press.style]}>
      <Pressable
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
      />
    </Reanimated.View>
  );
};
