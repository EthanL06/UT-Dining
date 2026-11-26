import { ChevronDown } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Animated, View } from 'react-native';

import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';

interface SkeletonItemProps {
  isHeader?: boolean;
}

const SkeletonItem = React.memo(({ isHeader = false }: SkeletonItemProps) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  const shimmerAnimation = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 750,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 750,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    return () => shimmerAnimation.stopAnimation();
  }, [shimmerAnimation]);

  const backgroundColor = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: isDarkMode ? ['#262626', '#404040'] : ['#d1d5db', '#f3f4f6'],
  });

  const HeaderSkeleton = () => (
    <View className="my-2 flex-row items-center justify-between">
      <Animated.View style={{ backgroundColor }} className="h-10 w-72 rounded-md" />
      <View className="rotate-180">
        <ChevronDown size={20} color={isDarkMode ? '#fff' : COLORS['ut-grey']} />
      </View>
    </View>
  );

  const FoodItemSkeleton = () => (
    <View className="mb-2">
      <Animated.View style={{ backgroundColor }} className="h-[4.25rem] w-full rounded-md" />
    </View>
  );

  return <View className="px-6">{isHeader ? <HeaderSkeleton /> : <FoodItemSkeleton />}</View>;
});

export default SkeletonItem;
