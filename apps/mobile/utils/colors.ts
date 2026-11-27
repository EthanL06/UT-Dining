export const COLORS = {
  'ut-burnt-orange': '#BF5700',
  'ut-grey': '#333F48',
  'ut-grey-dark-mode': '#9CA3AF',
  'status-open': '#22c55e',
  'status-closing': '#f59e0b',
  'status-closed': '#ef4444',
};

export const COLORBLIND_COLORS = {
  'ut-burnt-orange': '#BF5700',
  'ut-grey': '#333F48',
  'ut-grey-dark-mode': '#9CA3AF',
  'status-open': '#005AB5',
  'status-closing': '#E69F00',
  'status-closed': '#8F0000',
};

export function getColor(colorName: keyof typeof COLORS, isColorBlindMode: boolean): string {
  if (isColorBlindMode && colorName in COLORBLIND_COLORS) {
    return COLORBLIND_COLORS[colorName as keyof typeof COLORBLIND_COLORS];
  }
  return COLORS[colorName];
}
