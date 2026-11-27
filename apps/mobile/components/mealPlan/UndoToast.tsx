import { Pressable, View } from 'react-native';
import Reanimated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Text } from '~/components/ui/Text';
import { useTheme } from '~/utils/theme';

export const UndoToast = ({
  message,
  bottom,
  onUndo,
}: {
  message: string;
  bottom: number;
  onUndo: () => void;
}) => {
  const theme = useTheme();
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
