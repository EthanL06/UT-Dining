import { useState } from 'react';
import {
  ScrollView as NativeScrollView,
  type ScrollViewProps,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '~/utils/theme';

export const OverflowScrollView = ({
  as: Scroll = NativeScrollView,
  divider = true,
  containerStyle,
  containerClassName,
  style,
  onScroll,
  ...props
}: ScrollViewProps & {
  as?: typeof NativeScrollView;
  divider?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  containerClassName?: string;
}) => {
  const theme = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);

  const scroll = (
    <Scroll
      {...props}
      style={divider ? [{ flexShrink: 1 }, style] : style}
      alwaysBounceVertical={false}
      scrollEventThrottle={32}
      onScroll={(event) => {
        if (divider) setIsScrolled(event.nativeEvent.contentOffset.y > 0);
        onScroll?.(event);
      }}
    />
  );

  if (!divider) return scroll;

  return (
    <View className={containerClassName} style={[{ flexShrink: 1 }, containerStyle]}>
      {scroll}
      {isScrolled && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 0.5,
            backgroundColor: theme.separator,
          }}
        />
      )}
    </View>
  );
};
