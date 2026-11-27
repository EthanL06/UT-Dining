export const formatNumber = (value: number, digits = 0) =>
  value.toLocaleString('en-US', { maximumFractionDigits: digits });

export const formatGrams = (value: number) => `${formatNumber(value, 1)}g`;
