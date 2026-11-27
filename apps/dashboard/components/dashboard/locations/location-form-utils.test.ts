import { describe, expect, it } from 'vitest';
import type { Location } from '@/types/location';
import {
  copyTooltipLabel,
  hasLocationFormChanges,
  militaryToTimeInput,
  nextTimeRange,
  timeInputToMilitary,
  toLocationFormValues,
  validateMealTimes,
  validatePaymentMethodsRequired,
} from './location-form-utils';

describe('time conversion', () => {
  it('round trips military time through an HH:MM input', () => {
    expect(militaryToTimeInput(730)).toBe('07:30');
    expect(timeInputToMilitary('19:05')).toBe(1905);
    expect(timeInputToMilitary(militaryToTimeInput(2359))).toBe(2359);
  });
});

describe('nextTimeRange', () => {
  it('starts at 7 to 10 AM and then follows the last range', () => {
    expect(nextTimeRange([])).toEqual({ open: 700, close: 1000 });
    expect(nextTimeRange([{ open: 700, close: 1000 }])).toEqual({ open: 1100, close: 1200 });
    expect(nextTimeRange([{ open: 1800, close: 2230 }])).toEqual({ open: 2330, close: 2359 });
  });
});

describe('copyTooltipLabel', () => {
  it('names the next day until the copy happens', () => {
    expect(copyTooltipLabel(0, null)).toBe('Copy times to Tuesday');
    expect(copyTooltipLabel(0, 'monday')).toBe('Copied!');
  });
});

describe('validation', () => {
  it('requires at least one payment method', () => {
    expect(validatePaymentMethodsRequired([])).not.toBeNull();
    expect(validatePaymentMethodsRequired(['Dine In Dollars'])).toBeNull();
  });

  it('accepts no meal times and rejects a meal that ends before it starts', () => {
    expect(validateMealTimes([])).toBeNull();
    expect(validateMealTimes([{ name: 'Lunch', start_time: 1400, end_time: 1100 }])).not.toBeNull();
  });
});

describe('form values', () => {
  it('fills empty strings for missing optional fields when editing', () => {
    const values = toLocationFormValues({
      name: 'J2',
      colloquial_name: null,
      image: null,
      meal_times: null,
    } as unknown as Location);
    expect(values).toMatchObject({ name: 'J2', colloquial_name: '', image: '', meal_times: [] });
  });

  it('starts a new location closed to force close and open 7 to 10 AM', () => {
    const values = toLocationFormValues(null);
    expect(values.force_close).toBe(false);
    expect(values.regular_service_hours.monday.timeRanges).toEqual([{ open: 700, close: 1000 }]);
  });

  it('detects changes only after the form has a snapshot', () => {
    const snapshot = {
      formValues: toLocationFormValues(null),
      paymentMethods: ['Cash'],
      mealTimes: [],
    };
    expect(hasLocationFormChanges(null, snapshot)).toBe(false);
    expect(hasLocationFormChanges(snapshot, { ...snapshot })).toBe(false);
    expect(hasLocationFormChanges(snapshot, { ...snapshot, paymentMethods: [] })).toBe(true);
  });
});
