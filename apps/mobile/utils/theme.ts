import { useSettingsStore } from '~/store/useSettingsStore';

const LIGHT = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  separator: 'rgba(60, 60, 67, 0.18)',
  fill: 'rgba(120, 120, 128, 0.14)',
  tint: '#BF5700',
  tintSoft: 'rgba(191, 87, 0, 0.12)',
};

const DARK: typeof LIGHT = {
  background: '#000000',
  card: '#1C1C1E',
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  separator: 'rgba(84, 84, 88, 0.6)',
  fill: 'rgba(120, 120, 128, 0.26)',
  tint: '#E8782A',
  tintSoft: 'rgba(232, 120, 42, 0.18)',
};

export type Theme = typeof LIGHT;

export function getTheme(isDarkMode: boolean): Theme {
  return isDarkMode ? DARK : LIGHT;
}

export function useTheme(): Theme {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  return getTheme(isDarkMode);
}
