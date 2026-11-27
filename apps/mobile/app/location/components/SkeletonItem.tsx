import React, { useEffect } from 'react';
import { Animated, View } from 'react-native';

import type { RowPosition } from '~/components/FoodComponent';
import { useTheme } from '~/utils/theme';

const RADIUS = 26;

const SkeletonItem = React.memo(
  ({ isHeader = false, position = 'middle' }: { isHeader?: boolean; position?: RowPosition }) => {
    const theme = useTheme();
    const pulse = React.useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.5, duration: 750, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }, [pulse]);

    const bar = (width: number | `${number}%`, height: number) => (
      <Animated.View
        style={{
          width,
          height,
          borderRadius: height / 2,
          backgroundColor: theme.fill,
          opacity: pulse,
        }}
      />
    );

    if (isHeader) {
      return <View className="mx-5 mt-6 mb-3">{bar(160, 20)}</View>;
    }

    const top = position === 'first' || position === 'single';
    const bottom = position === 'last' || position === 'single';

    return (
      <View
        className="mx-4 min-h-[60px] justify-center gap-y-2 px-4 py-3"
        style={{
          backgroundColor: theme.card,
          borderTopLeftRadius: top ? RADIUS : 0,
          borderTopRightRadius: top ? RADIUS : 0,
          borderBottomLeftRadius: bottom ? RADIUS : 0,
          borderBottomRightRadius: bottom ? RADIUS : 0,
        }}
      >
        {!top && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              left: 16,
              height: 0.5,
              backgroundColor: theme.separator,
            }}
          />
        )}
        {bar('62%', 14)}
        {bar('40%', 11)}
      </View>
    );
  },
);

export default SkeletonItem;
