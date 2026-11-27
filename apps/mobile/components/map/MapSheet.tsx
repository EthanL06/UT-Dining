import { Search, X } from 'lucide-react-native';
import { type ReactNode, type Ref, useEffect, useImperativeHandle } from 'react';
import { Keyboard, Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '~/components/ui/Text';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

export { MAP_FILTERS, type MapFilterId, PLACE_ICONS, usePlaceColor } from './placeStyle';

export type Detent = 'collapsed' | 'half' | 'full';

export type MapSheetHandle = { snapTo: (detent: Detent) => void };

export type SheetMode = 'browse' | 'search' | 'place';

const SPRING = { damping: 22, stiffness: 220, mass: 0.6 };

const SHEET_TOP_GAP = 12;
export const SHEET_HALF_FRACTION = 0.42;

export const MapSheet = ({
  ref,
  mode,
  placeKey,
  query,
  onQueryChange,
  onFocusSearch,
  onCancelSearch,
  onSubmitSearch,
  bottomOffset,
  onHeightChange,
  children,
}: {
  ref?: Ref<MapSheetHandle>;
  mode: SheetMode;
  placeKey: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onFocusSearch: () => void;
  onCancelSearch: () => void;
  onSubmitSearch: () => void;
  bottomOffset: number;
  onHeightChange: (height: number) => void;
  children: ReactNode;
}) => {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heights: Record<Detent, number> = {
    collapsed: 178,
    half: Math.round(windowHeight * SHEET_HALF_FRACTION),
    full: Math.min(
      Math.round(windowHeight * 0.78),
      windowHeight - insets.top - SHEET_TOP_GAP - bottomOffset,
    ),
  };
  const height = useSharedValue(heights.half);
  const dragStart = useSharedValue(0);

  const snapTo = (detent: Detent) => {
    height.value = withSpring(heights[detent], SPRING);
    onHeightChange(heights[detent]);
  };

  useImperativeHandle(ref, () => ({ snapTo }));

  // biome-ignore lint/correctness/useExhaustiveDependencies: report the starting height once
  useEffect(() => {
    onHeightChange(heights.half);
  }, []);

  useEffect(() => {
    if (placeKey) {
      height.value = withSpring(heights.half, SPRING);
      onHeightChange(heights.half);
    }
  }, [placeKey, height, heights.half, onHeightChange]);

  const settle = (velocity: number) => {
    const current = height.value - velocity * 0.12;
    const nearest = (Object.keys(heights) as Detent[]).reduce((best, detent) =>
      Math.abs(heights[detent] - current) < Math.abs(heights[best] - current) ? detent : best,
    );
    if (heights[nearest] !== dragStart.value) haptics.selection();
    if (nearest !== 'full') Keyboard.dismiss();
    snapTo(nearest);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = height.value;
    })
    .onUpdate((event) => {
      height.value = Math.min(
        heights.full,
        Math.max(heights.collapsed - 20, dragStart.value - event.translationY),
      );
    })
    .onEnd((event) => {
      runOnJS(settle)(-event.velocityY);
    });

  const style = useAnimatedStyle(() => ({ height: height.value + bottomOffset }));

  return (
    <Reanimated.View
      style={[
        style,
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: 34,
          borderTopRightRadius: 34,
          borderCurve: 'continuous',
          backgroundColor: theme.background,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -2 },
          overflow: 'hidden',
        },
      ]}
    >
      <GestureDetector gesture={pan}>
        <View className="pt-2 pb-3">
          <View
            className="mb-2.5 h-[5px] w-9 self-center rounded-full"
            style={{ backgroundColor: theme.tertiaryLabel }}
          />
          {mode !== 'place' && (
            <View className="mx-4 flex-row items-center gap-x-3">
              <View
                className="h-10 flex-1 flex-row items-center gap-x-2 rounded-full px-3"
                style={{ backgroundColor: theme.fill }}
              >
                <Search size={17} color={theme.secondaryLabel} />
                <TextInput
                  testID="map-search-input"
                  variant="callout"
                  className="flex-1"
                  placeholder="Places, foods or buildings"
                  autoCorrect={false}
                  autoCapitalize="none"
                  value={query}
                  onChangeText={onQueryChange}
                  onFocus={() => {
                    snapTo('full');
                    onFocusSearch();
                  }}
                  onSubmitEditing={() => {
                    snapTo('half');
                    onSubmitSearch();
                  }}
                  returnKeyType="search"
                />
                {query.length > 0 && (
                  <Pressable
                    testID="map-search-clear"
                    accessibilityLabel="Clear search"
                    hitSlop={8}
                    onPress={() => onQueryChange('')}
                  >
                    <X size={16} color={theme.secondaryLabel} />
                  </Pressable>
                )}
              </View>
              {mode === 'search' && (
                <Pressable
                  testID="map-search-cancel"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    Keyboard.dismiss();
                    snapTo('half');
                    onCancelSearch();
                  }}
                >
                  <Text variant="callout" tone="tint">
                    Cancel
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </GestureDetector>
      <View style={{ flex: 1 }}>{children}</View>
    </Reanimated.View>
  );
};
