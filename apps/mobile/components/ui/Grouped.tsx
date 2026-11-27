import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { type ReactNode, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '~/components/ui/Text';

import { useSettingsStore } from '~/store/useSettingsStore';
import { getColor } from '~/utils/colors';
import { useTheme } from '~/utils/theme';
import { statusDotTone } from '~/utils/time';

export const GroupedSection = ({
  header,
  footer,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) => {
  const theme = useTheme();

  return (
    <View className="mb-5">
      {header !== undefined &&
        (typeof header === 'string' ? (
          <Text variant="footnote" tone="secondary" className="mx-9 mb-1.5">
            {header}
          </Text>
        ) : (
          header
        ))}
      <View
        className="mx-4 overflow-hidden"
        style={{ backgroundColor: theme.card, borderRadius: 26, borderCurve: 'continuous' }}
      >
        {children}
      </View>
      {footer !== undefined &&
        (typeof footer === 'string' ? (
          <Text variant="footnote" tone="secondary" className="mx-9 mt-1.5">
            {footer}
          </Text>
        ) : (
          footer
        ))}
    </View>
  );
};

export const GroupedRow = ({
  title,
  subtitle,
  leading,
  trailing,
  detail,
  showChevron = false,
  isFirst = false,
  separatorInset = 16,
  titleColor,
  multilineSubtitle = false,
  onPress,
  onLongPress,
  disabled,
  testID,
  detailTestID,
  selected,
  accessibilityRole,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  detail?: string;
  showChevron?: boolean;
  isFirst?: boolean;
  separatorInset?: number;
  titleColor?: string;
  multilineSubtitle?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  testID?: string;
  detailTestID?: string;
  selected?: boolean;
  accessibilityRole?: 'button' | 'link';
}) => {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessible={!!onPress || !!accessibilityRole}
      accessibilityRole={accessibilityRole ?? (onPress ? 'button' : undefined)}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || (!onPress && !accessibilityRole)}
    >
      {({ pressed }) => (
        <View style={{ backgroundColor: pressed ? theme.fill : 'transparent' }}>
          {!isFirst && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                left: separatorInset,
                height: 0.5,
                backgroundColor: theme.separator,
              }}
            />
          )}
          <View className="min-h-[52px] flex-row items-center gap-x-3 px-4 py-2.5">
            {leading}
            <View className="flex-1">
              {typeof title === 'string' ? (
                <Text numberOfLines={1} color={titleColor}>
                  {title}
                </Text>
              ) : (
                title
              )}
              {subtitle !== undefined &&
                (typeof subtitle === 'string' ? (
                  <Text
                    variant="subheadline"
                    tone="secondary"
                    numberOfLines={multilineSubtitle ? undefined : 1}
                    className="mt-0.5"
                  >
                    {subtitle}
                  </Text>
                ) : (
                  subtitle
                ))}
            </View>
            {detail !== undefined && (
              <Text variant="subheadline" tone="secondary" testID={detailTestID}>
                {detail}
              </Text>
            )}
            {trailing}
            {showChevron && <ChevronRight size={17} color={theme.tertiaryLabel} />}
          </View>
        </View>
      )}
    </Pressable>
  );
};

export const IconSquare = ({ Icon, color }: { Icon: LucideIcon; color: string }) => (
  <View
    className="size-[30px] items-center justify-center"
    style={{ backgroundColor: color, borderRadius: 7, borderCurve: 'continuous' }}
  >
    <Icon size={17} color="#FFFFFF" />
  </View>
);

const PULSE_MS = 2200;

export const StatusDot = ({
  open,
  closesInMinutes = null,
}: {
  open: boolean;
  closesInMinutes?: number | null;
}) => {
  const isColorBlindMode = useSettingsStore((state) => state.isColorBlindMode);
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const tone = statusDotTone(open, closesInMinutes);
  const pulse = useSharedValue(0);
  const pulsing = tone !== 'closed' && !reduceMotion;

  useEffect(() => {
    if (!pulsing) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulsing, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: pulse.value === 0 ? 0 : 0.45 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.4 }],
  }));

  if (tone === 'closed') {
    return (
      <View
        testID="status-dot-closed"
        className="size-[9px] rounded-full"
        style={{ borderWidth: 1.5, borderColor: theme.secondaryLabel }}
      />
    );
  }

  const color = getColor(
    tone === 'closingSoon' ? 'status-closing' : 'status-open',
    isColorBlindMode,
  );
  return (
    <View
      testID={tone === 'closingSoon' ? 'status-dot-closing' : 'status-dot-open'}
      className="size-[9px] items-center justify-center"
    >
      <Reanimated.View
        pointerEvents="none"
        className="absolute size-[9px] rounded-full"
        style={[{ backgroundColor: color }, haloStyle]}
      />
      <View className="size-[9px] rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
};
