import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Reanimated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '~/components/ui/Text';
import { useTheme } from '~/utils/theme';

const DEFAULT_DURATION_MS = 4000;

export const UndoToast = ({
  message,
  bottom,
  duration = DEFAULT_DURATION_MS,
  onUndo,
}: {
  message: string;
  bottom: number;
  duration?: number;
  onUndo: () => void;
}) => {
  const theme = useTheme();
  const remaining = useSharedValue(1);

  useEffect(() => {
    remaining.value = 1;
    remaining.value = withTiming(0, { duration, easing: Easing.linear });
  }, [duration, remaining]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: remaining.value }] }));
  return (
    <Reanimated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom }}
    >
      <View
        testID="meal-plan-undo-toast"
        className="min-h-[52px] flex-row items-center gap-x-3 rounded-full py-2 pr-2 pl-5"
        style={{
          backgroundColor: theme.toast,
          borderWidth: 0.5,
          borderColor: theme.toastBorder,
          borderCurve: 'continuous',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Reanimated.View
          testID="meal-plan-undo-progress"
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 22,
              right: 22,
              bottom: 4,
              height: 2.5,
              borderRadius: 1.25,
              backgroundColor: theme.tint,
              transformOrigin: 'left',
            },
            barStyle,
          ]}
        />
        <Text variant="subheadline" numberOfLines={1} className="flex-1" color={theme.toastLabel}>
          {message}
        </Text>
        <Pressable
          testID="meal-plan-undo-button"
          accessibilityRole="button"
          accessibilityLabel="Undo"
          onPress={onUndo}
          className="h-9 justify-center rounded-full px-4"
          style={{ backgroundColor: theme.tint }}
        >
          <Text variant="subheadline" emphasized tone="onTint">
            Undo
          </Text>
        </Pressable>
      </View>
    </Reanimated.View>
  );
};
