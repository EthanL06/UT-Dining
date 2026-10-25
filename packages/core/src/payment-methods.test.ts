import { describe, expect, it } from 'vitest';

import {
  isPaymentMethod,
  PAYMENT_METHOD_ABBREVIATIONS,
  PAYMENT_METHODS,
} from './payment-methods.ts';

describe('payment methods', () => {
  it('has an abbreviation for every method', () => {
    expect(Object.keys(PAYMENT_METHOD_ABBREVIATIONS).sort()).toEqual([...PAYMENT_METHODS].sort());
  });

  it('recognises stored values', () => {
    expect(isPaymentMethod('Bevo Pay')).toBe(true);
    expect(isPaymentMethod('Venmo')).toBe(false);
  });
});
