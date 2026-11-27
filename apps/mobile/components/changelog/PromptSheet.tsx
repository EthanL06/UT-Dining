import { type ReactNode, useEffect, useMemo } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SheetDragProvider } from '~/components/map/SheetScrollView';

const ENTER = { duration: 380, easing: Easing.out(Easing.cubic) };
const EXIT = { duration: 260, easing: Easing.in(Easing.cubic) };
const SETTLE = { damping: 30, stiffness: 320, overshootClamping: true };
const DISMISS_DISTANCE = 0.3;
const DISMISS_VELOCITY = 900;

interface PromptSheetProps {
  visible: boolean;
  dismissible: boolean;
  onDismiss: () => void;
  onClosed: () => void;
  children: ReactNode;
}

export const PromptSheet = ({
  visible,
  dismissible,
  onDismiss,
  onClosed,
  children,
}: PromptSheetProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const offset = useSharedValue(windowHeight);
  const sheetHeight = useSharedValue(windowHeight);
  const scrollY = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const lastTranslation = useSharedValue(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: shared values are stable and onClosed is read when the exit finishes
  useEffect(() => {
    if (visible) {
      offset.value = withTiming(0, ENTER);
      return;
    }
    offset.value = withTiming(Math.max(sheetHeight.value, windowHeight), EXIT, (finished) => {
      if (finished) runOnJS(onClosed)();
    });
  }, [visible]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: shared values are read inside worklets and onDismiss through runOnJS
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(dismissible)
        .activeOffsetY([-8, 8])
        .failOffsetX([-20, 20])
        .onStart(() => {
          dragStart.value = offset.value;
          lastTranslation.value = 0;
        })
        .onUpdate((event) => {
          const delta = event.translationY - lastTranslation.value;
          lastTranslation.value = event.translationY;
          if (delta > 0 && scrollY.value > 0) return;
          const next = offset.value + delta;
          offset.value = next < 0 ? Math.max(-24, offset.value + delta / 4) : next;
        })
        .onEnd((event) => {
          const pastDistance = offset.value > sheetHeight.value * DISMISS_DISTANCE;
          const flicked = event.velocityY > DISMISS_VELOCITY && offset.value > 0;
          if (pastDistance || flicked) {
            runOnJS(onDismiss)();
            return;
          }
          offset.value = withSpring(0, SETTLE);
        }),
    [dismissible],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, sheetHeight.value], [1, 0], 'clamp'),
  }));

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 justify-end p-2">
          <Reanimated.View
            pointerEvents="none"
            className="absolute inset-0 bg-black/40"
            style={backdropStyle}
          />
          <Pressable
            className="absolute inset-0"
            accessibilityLabel="Close"
            disabled={!dismissible}
            onPress={onDismiss}
          />
          <SheetDragProvider value={{ pan, scrollY, isExpanded: true }}>
            <GestureDetector gesture={pan}>
              <Reanimated.View
                style={[{ maxHeight: '88%' }, sheetStyle]}
                onLayout={(event) => {
                  sheetHeight.value = event.nativeEvent.layout.height;
                }}
              >
                {children}
              </Reanimated.View>
            </GestureDetector>
          </SheetDragProvider>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};
