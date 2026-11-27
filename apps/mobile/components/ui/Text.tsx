import type { ComponentRef, Ref } from 'react';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps as NativeTextInputProps,
  type TextProps as NativeTextProps,
  type TextStyle,
} from 'react-native';
import { type Theme, useTheme } from '~/utils/theme';

type Weight = NonNullable<TextStyle['fontWeight']>;

type VariantSpec = {
  fontSize: number;
  fontWeight: Weight;
  lineHeight?: number;
  paragraphLineHeight?: number;
  letterSpacing?: number;
  textTransform?: TextStyle['textTransform'];
};

export const WEIGHTS = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, Weight>;

export const TEXT_VARIANTS = {
  display: { fontSize: 38, fontWeight: WEIGHTS.bold, lineHeight: 44 },
  largeTitle: { fontSize: 34, fontWeight: WEIGHTS.bold, lineHeight: 41 },
  title1: { fontSize: 28, fontWeight: WEIGHTS.bold, lineHeight: 34 },
  title2: { fontSize: 22, fontWeight: WEIGHTS.bold, lineHeight: 28 },
  title3: { fontSize: 20, fontWeight: WEIGHTS.bold, lineHeight: 25 },
  headline: { fontSize: 17, fontWeight: WEIGHTS.semibold },
  body: { fontSize: 17, fontWeight: WEIGHTS.regular, paragraphLineHeight: 23 },
  callout: { fontSize: 16, fontWeight: WEIGHTS.regular, paragraphLineHeight: 22 },
  subheadline: { fontSize: 15, fontWeight: WEIGHTS.regular, paragraphLineHeight: 22 },
  footnote: { fontSize: 13, fontWeight: WEIGHTS.regular, paragraphLineHeight: 18 },
  caption: { fontSize: 12, fontWeight: WEIGHTS.regular, paragraphLineHeight: 17 },
  caption2: { fontSize: 11, fontWeight: WEIGHTS.regular, paragraphLineHeight: 14 },
  eyebrow: {
    fontSize: 12,
    fontWeight: WEIGHTS.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, VariantSpec>;

export type TextVariant = keyof typeof TEXT_VARIANTS;

export const TONES = {
  primary: (theme: Theme) => theme.label,
  secondary: (theme: Theme) => theme.secondaryLabel,
  tertiary: (theme: Theme) => theme.tertiaryLabel,
  tint: (theme: Theme) => theme.tint,
  onTint: () => '#FFFFFF',
} as const;

export type TextTone = keyof typeof TONES;

type TypographyOptions = {
  variant?: TextVariant;
  emphasized?: boolean;
  paragraph?: boolean;
};

export function typography({
  variant = 'body',
  emphasized = false,
  paragraph = false,
}: TypographyOptions = {}): TextStyle {
  const spec: VariantSpec = TEXT_VARIANTS[variant];
  const lineHeight = paragraph ? (spec.paragraphLineHeight ?? spec.lineHeight) : spec.lineHeight;
  return {
    fontSize: spec.fontSize,
    fontWeight:
      emphasized && spec.fontWeight === WEIGHTS.regular ? WEIGHTS.semibold : spec.fontWeight,
    ...(lineHeight !== undefined && { lineHeight }),
    ...(spec.letterSpacing !== undefined && { letterSpacing: spec.letterSpacing }),
    ...(spec.textTransform !== undefined && { textTransform: spec.textTransform }),
  };
}

export type TextProps = NativeTextProps &
  TypographyOptions & {
    tone?: TextTone;
    color?: string;
    className?: string;
    ref?: Ref<ComponentRef<typeof NativeText>>;
  };

export function Text({
  variant,
  emphasized,
  paragraph,
  tone = 'primary',
  color,
  style,
  ...props
}: TextProps) {
  const theme = useTheme();
  return (
    <NativeText
      {...props}
      style={[
        typography({ variant, emphasized, paragraph }),
        { color: color ?? TONES[tone](theme) },
        style,
      ]}
    />
  );
}

export type TextInputHandle = ComponentRef<typeof NativeTextInput>;

export type TextInputProps = NativeTextInputProps &
  Omit<TypographyOptions, 'paragraph'> & {
    tone?: TextTone;
    color?: string;
    className?: string;
    ref?: Ref<TextInputHandle>;
  };

export function TextInput({
  variant,
  emphasized,
  tone = 'primary',
  color,
  placeholderTextColor,
  style,
  ...props
}: TextInputProps) {
  const theme = useTheme();
  return (
    <NativeTextInput
      placeholderTextColor={placeholderTextColor ?? theme.secondaryLabel}
      {...props}
      style={[typography({ variant, emphasized }), { color: color ?? TONES[tone](theme) }, style]}
    />
  );
}
