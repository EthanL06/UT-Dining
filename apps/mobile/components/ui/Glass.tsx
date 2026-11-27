import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ReactNode, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  type ColorValue,
  type Insets,
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSettingsStore } from '~/store/useSettingsStore';

const isGlassSupported = Platform.OS === 'ios' && isLiquidGlassAvailable();

const useReduceTransparency = () => {
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    if (!isGlassSupported) return;
    let isMounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (isMounted) setIsReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setIsReduced,
    );
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return isReduced;
};

export const useLiquidGlass = () => {
  const isReduced = useReduceTransparency();
  return isGlassSupported && !isReduced;
};

export const GlassSurface = ({
  fallbackColor,
  isInteractive = false,
  tintColor,
  style,
  children,
  ...rest
}: ViewProps & {
  fallbackColor: ColorValue;
  isInteractive?: boolean;
  tintColor?: ColorValue;
}) => {
  const hasGlass = useLiquidGlass();
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  if (!hasGlass) {
    return (
      <View style={[{ backgroundColor: fallbackColor }, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      glassEffectStyle="regular"
      isInteractive={isInteractive}
      tintColor={tintColor}
      colorScheme={isDarkMode ? 'dark' : 'light'}
      style={style}
      {...rest}
    >
      {children}
    </GlassView>
  );
};

export const GlassButton = ({
  size,
  fallbackColor,
  onPress,
  testID,
  accessibilityLabel,
  hitSlop,
  style,
  children,
}: {
  size: number;
  fallbackColor: ColorValue;
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
  hitSlop?: number | Insets;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) => {
  const radius = size / 2;

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={onPress}
      style={[{ width: size, height: size, borderRadius: radius }, style]}
    >
      <GlassSurface
        isInteractive
        fallbackColor={fallbackColor}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        {children}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
