import type React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useTheme } from '~/utils/theme';
import { cn } from '~/utils/utils';

interface ProgressIndicatorProps {
  step: number;
  totalSteps: number;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  step,
  totalSteps,
  className,
}) => {
  const theme = useTheme();

  const progressStyle = useAnimatedStyle(() => {
    const progress = (step / (totalSteps - 1)) * 100;
    return {
      width: withSpring(`${Math.max(1, Math.min(100, progress))}%`, {
        damping: 20,
        stiffness: 200,
      }),
      transform: [{ translateX: withSpring(0) }],
    };
  });

  return (
    <View
      className={cn('h-1.5 w-full overflow-hidden rounded-full', className)}
      style={{ backgroundColor: theme.fill }}
    >
      <Animated.View
        className="h-full rounded-full"
        style={[{ backgroundColor: theme.tint }, progressStyle]}
      />
    </View>
  );
};
