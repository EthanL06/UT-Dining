import { useEffect } from 'react';
import { View } from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '~/utils/theme';

const TITLE_WIDTHS = ['62%', '48%', '70%', '54%', '40%'] as const;

export const SkeletonRows = ({ count = 5, testID }: { count?: number; testID?: string }) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) opacity.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true);
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel="Loading places"
      className="mx-3 overflow-hidden"
      style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
    >
      <Reanimated.View style={pulse}>
        {TITLE_WIDTHS.slice(0, count).map((width, index) => (
          <View key={width} className="min-h-[58px] flex-row items-center gap-x-3 px-4 py-2.5">
            {index > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  left: 64,
                  height: 0.5,
                  backgroundColor: theme.separator,
                }}
              />
            )}
            <View className="size-9 rounded-[10px]" style={{ backgroundColor: theme.fill }} />
            <View className="flex-1 gap-y-2">
              <View className="h-3.5 rounded-full" style={{ width, backgroundColor: theme.fill }} />
              <View className="h-3 w-1/3 rounded-full" style={{ backgroundColor: theme.fill }} />
            </View>
          </View>
        ))}
      </Reanimated.View>
    </View>
  );
};
