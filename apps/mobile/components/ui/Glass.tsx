import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, type ColorValue, Platform, View, type ViewProps } from 'react-native';
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
