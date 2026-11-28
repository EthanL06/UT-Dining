import { type ReactNode, useEffect } from 'react';
import { type DimensionValue, View, type ViewStyle } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '~/utils/theme';

export const SkeletonPulse = ({
  children,
  label = 'Loading',
  testID,
  style,
}: {
  children: ReactNode;
  label?: string;
  testID?: string;
  style?: ViewStyle;
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 750 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Reanimated.View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[style, pulse]}
    >
      {children}
    </Reanimated.View>
  );
};

export const SkeletonBar = ({
  width,
  height,
  radius,
  style,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? height / 2,
          borderCurve: 'continuous',
          backgroundColor: theme.fill,
        },
        style,
      ]}
    />
  );
};

export type SkeletonLeading = 'dot' | 'icon' | 'none';

const TITLE_WIDTHS: DimensionValue[] = ['58%', '44%', '66%', '50%', '38%', '62%', '46%'];
const SUBTITLE_WIDTHS: DimensionValue[] = ['34%', '42%', '28%', '38%'];

const LEADING_INSET: Record<SkeletonLeading, number> = { dot: 37, icon: 58, none: 16 };

const LeadingShape = ({ kind }: { kind: SkeletonLeading }) => {
  switch (kind) {
    case 'dot':
      return <SkeletonBar width={9} height={9} />;
    case 'icon':
      return <SkeletonBar width={30} height={30} radius={7} />;
    case 'none':
      return null;
  }
};

export const SkeletonGroupedSection = ({
  rows,
  header = true,
  leading = 'none',
  subtitle = true,
  trailing = false,
  offset = 0,
}: {
  rows: number;
  header?: boolean;
  leading?: SkeletonLeading;
  subtitle?: boolean;
  trailing?: boolean;
  offset?: number;
}) => {
  const theme = useTheme();
  return (
    <View className="mb-5">
      {header && <SkeletonBar width={84} height={11} style={{ marginLeft: 36, marginBottom: 9 }} />}
      <View
        className="mx-4 overflow-hidden"
        style={{ backgroundColor: theme.card, borderRadius: 26, borderCurve: 'continuous' }}
      >
        {Array.from({ length: rows }, (_, index) => index + offset).map((index) => (
          <View
            key={index}
            className="flex-row items-center gap-x-3 px-4 py-2.5"
            style={{ minHeight: subtitle ? 64 : 52 }}
          >
            {index > offset && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  left: LEADING_INSET[leading],
                  height: 0.5,
                  backgroundColor: theme.separator,
                }}
              />
            )}
            <LeadingShape kind={leading} />
            <View className="flex-1 gap-y-2">
              <SkeletonBar width={TITLE_WIDTHS[index % TITLE_WIDTHS.length]} height={14} />
              {subtitle && (
                <SkeletonBar width={SUBTITLE_WIDTHS[index % SUBTITLE_WIDTHS.length]} height={11} />
              )}
            </View>
            {trailing && <SkeletonBar width={64} height={12} />}
          </View>
        ))}
      </View>
    </View>
  );
};
