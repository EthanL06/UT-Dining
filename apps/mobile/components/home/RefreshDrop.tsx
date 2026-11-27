import { formatCentral } from '@ut-dining/core';
import { GlassView } from 'expo-glass-effect';
import { Check, CircleAlert, Utensils } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useLiquidGlass } from '~/components/ui/Glass';
import { Text } from '~/components/ui/Text';
import { useSettingsStore } from '~/store/useSettingsStore';
import {
  BUBBLE_SIZE,
  dropFrame,
  islandFor,
  type RefreshStatus,
  refreshMessage,
} from '~/utils/pullRefresh';
import { useTheme } from '~/utils/theme';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const AnimatedGlassView = Reanimated.createAnimatedComponent(GlassView);

const RING_RADIUS = 16;
const RING_STROKE = 2.8;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SPIN_ARC = 0.28;
const PILL_HOLD_MS = 1900;
const PILL_PADDING_X = 26;
const PILL_PADDING_Y = 14;
const MIN_PILL_HEIGHT = 36;
const LIGHT_SHADOW = '0px 4px 14px rgba(0, 0, 0, 0.12)';
const DARK_SHADOW = '0px 4px 14px rgba(0, 0, 0, 0.5)';

const timeLabel = () => formatCentral(Date.now(), { hour: '2-digit', minute: '2-digit' });

export const RefreshDrop = ({
  pull,
  status,
  onFinished,
}: {
  pull: SharedValue<number>;
  status: RefreshStatus;
  onFinished: () => void;
}) => {
  const theme = useTheme();
  const hasGlass = useLiquidGlass();
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const reduceMotion = useReducedMotion();
  const { top: safeTop } = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const island = islandFor(Platform.OS, safeTop);
  const [message, setMessage] = useState('');
  const [rowWidth, setRowWidth] = useState(0);

  const spin = useSharedValue(0);
  const pill = useSharedValue(0);
  const float = useSharedValue(0);
  const retract = useSharedValue(0);
  const rotation = useSharedValue(0);
  const pillWidth = useSharedValue(190);
  const pillHeight = useSharedValue(MIN_PILL_HEIGHT);

  const result = status.kind === 'settled' ? status.result : null;

  useEffect(() => {
    switch (status.kind) {
      case 'idle':
        cancelAnimation(rotation);
        spin.value = 0;
        pill.value = 0;
        float.value = 0;
        retract.value = 0;
        return;
      case 'refreshing':
        pill.value = 0;
        float.value = 0;
        retract.value = 0;
        spin.value = 1;
        if (!reduceMotion) {
          rotation.value = 0;
          rotation.value = withRepeat(
            withTiming(360, { duration: 850, easing: Easing.linear }),
            -1,
            false,
          );
        }
        return;
      case 'settled':
        return;
    }
  }, [status.kind, spin, pill, float, retract, rotation, reduceMotion]);

  useEffect(() => {
    if (result === null) return;
    const text = refreshMessage(result, timeLabel());
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    pill.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    float.value = withDelay(
      120,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
    retract.value = withDelay(
      PILL_HOLD_MS,
      withTiming(1, { duration: 380, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinished)();
      }),
    );
  }, [result, pill, float, retract, onFinished]);

  const frame = useDerivedValue(() =>
    dropFrame({
      pull: pull.value,
      safeTop,
      island,
      spin: spin.value,
      pill: pill.value,
      float: float.value,
      retract: retract.value,
      pillWidth: pillWidth.value,
      pillHeight: pillHeight.value,
    }),
  );

  const shell = useAnimatedStyle(() => {
    const f = frame.value;
    return {
      opacity: f.opacity,
      width: f.width,
      height: f.height,
      top: f.centerY - f.height / 2,
      left: (screenWidth - f.width) / 2,
    };
  });
  const corners = useAnimatedStyle(() => ({
    borderRadius: Math.min(frame.value.width, frame.value.height) / 2,
  }));
  const shadow = isDarkMode ? DARK_SHADOW : LIGHT_SHADOW;
  const ink = useAnimatedStyle(() => ({ opacity: frame.value.ink }));
  const ring = useAnimatedStyle(() => ({
    opacity: frame.value.ringOpacity,
    transform: [{ rotate: `${spin.value > 0 ? rotation.value : 0}deg` }],
  }));
  const glyph = useAnimatedStyle(() => ({ opacity: frame.value.ringOpacity }));
  const pillStyle = useAnimatedStyle(() => ({ opacity: frame.value.pillOpacity }));
  const arc = useAnimatedProps(() => {
    const length = spin.value > 0 ? SPIN_ARC : frame.value.progress;
    return { strokeDashoffset: CIRCUMFERENCE * (1 - length) };
  });

  const measurePill = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRowWidth(width);
    pillWidth.value = width + PILL_PADDING_X;
    pillHeight.value = Math.max(MIN_PILL_HEIGHT, height + PILL_PADDING_Y);
  };

  const badge =
    result === 'updated' ? (
      <View style={[styles.badge, { backgroundColor: theme.tint }]}>
        <Check size={11} color="#FFFFFF" strokeWidth={3.2} />
      </View>
    ) : (
      <CircleAlert size={18} color={theme.secondaryLabel} strokeWidth={2.2} />
    );

  return (
    <>
      <View
        pointerEvents="none"
        onLayout={measurePill}
        style={[styles.pillRow, styles.measure]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {badge}
        <Text variant="footnote" emphasized numberOfLines={1}>
          {message}
        </Text>
      </View>
      <Reanimated.View pointerEvents="none" style={[styles.shell, shell]}>
        {hasGlass ? (
          <AnimatedGlassView
            glassEffectStyle="regular"
            colorScheme={isDarkMode ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, { boxShadow: shadow }, corners]}
          />
        ) : (
          <Reanimated.View
            style={[
              StyleSheet.absoluteFill,
              styles.fallback,
              { backgroundColor: theme.card, borderColor: theme.separator, boxShadow: shadow },
              corners,
            ]}
          />
        )}
        <Reanimated.View style={[StyleSheet.absoluteFill, styles.clip, corners]}>
          <Reanimated.View style={[StyleSheet.absoluteFill, styles.ink, ink]} />
          <Reanimated.View style={[styles.center, glyph]}>
            <Utensils size={16} color={theme.label} strokeWidth={2.2} />
          </Reanimated.View>
          <Reanimated.View style={[styles.center, ring]}>
            <Svg width={BUBBLE_SIZE} height={BUBBLE_SIZE} viewBox="0 0 40 40">
              <Circle
                cx={20}
                cy={20}
                r={RING_RADIUS}
                fill="none"
                stroke={theme.fill}
                strokeWidth={RING_STROKE}
              />
              <AnimatedCircle
                cx={20}
                cy={20}
                r={RING_RADIUS}
                fill="none"
                stroke={theme.tint}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                animatedProps={arc}
                rotation={-90}
                origin="20, 20"
              />
            </Svg>
          </Reanimated.View>
          <Reanimated.View style={[styles.center, pillStyle]}>
            <View style={[styles.pillRow, { width: rowWidth }]}>
              {badge}
              <Text variant="footnote" emphasized numberOfLines={1}>
                {message}
              </Text>
            </View>
          </Reanimated.View>
        </Reanimated.View>
      </Reanimated.View>
    </>
  );
};

const styles = StyleSheet.create({
  shell: { position: 'absolute', zIndex: 10 },
  clip: { overflow: 'hidden' },
  fallback: { borderWidth: StyleSheet.hairlineWidth },
  ink: { backgroundColor: '#000000' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  measure: { position: 'absolute', top: -200, left: 0, opacity: 0 },
  badge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
