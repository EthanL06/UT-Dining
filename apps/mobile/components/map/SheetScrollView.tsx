import { createContext, type ReactNode, use, useMemo } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';

type SheetDrag = {
  pan: GestureType;
  scrollY: SharedValue<number>;
  isExpanded: boolean;
};

const SheetDragContext = createContext<SheetDrag | null>(null);

export const SheetDragProvider = ({
  value,
  children,
}: {
  value: SheetDrag;
  children: ReactNode;
}) => <SheetDragContext value={value}>{children}</SheetDragContext>;

export const SheetScrollView = ({
  onScroll,
  ...props
}: ScrollViewProps & {
  containerStyle?: StyleProp<ViewStyle>;
  containerClassName?: string;
}) => {
  const drag = use(SheetDragContext);
  const native = useMemo(() => {
    const gesture = Gesture.Native();
    return drag ? gesture.simultaneousWithExternalGesture(drag.pan) : gesture;
  }, [drag]);

  return (
    <OverflowScrollView
      {...props}
      wrap={(scroll) => <GestureDetector gesture={native}>{scroll}</GestureDetector>}
      scrollEnabled={drag ? drag.isExpanded : true}
      bounces={false}
      scrollEventThrottle={16}
      onScroll={(event) => {
        if (drag) drag.scrollY.value = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
    />
  );
};
