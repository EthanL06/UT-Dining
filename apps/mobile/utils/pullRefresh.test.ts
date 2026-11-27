import { describe, expect, it } from 'vitest';
import {
  BUBBLE_SIZE,
  type DropInput,
  dropFrame,
  islandFor,
  PULL_TRIGGER,
  refreshMessage,
} from './pullRefresh';

const island = { top: 11, width: 126, height: 37 };

const base: DropInput = {
  pull: 0,
  safeTop: 59,
  island,
  spin: 0,
  pill: 0,
  float: 0,
  retract: 0,
  pillWidth: 190,
  pillHeight: 36,
};

describe('islandFor', () => {
  it('finds the Dynamic Island from the safe area on iPhones that have one', () => {
    expect(islandFor('ios', 59)).toEqual({ top: 11, width: 126, height: 37 });
    expect(islandFor('ios', 62)?.top).toBe(14);
  });

  it('returns null for notched phones, home button phones and Android', () => {
    expect(islandFor('ios', 47)).toBeNull();
    expect(islandFor('ios', 20)).toBeNull();
    expect(islandFor('android', 59)).toBeNull();
  });
});

describe('refreshMessage', () => {
  it('describes each result', () => {
    expect(refreshMessage('updated', '02:40 PM')).toBe('Menus updated 02:40 PM');
    expect(refreshMessage('offline', '02:40 PM')).toBe("You're offline");
    expect(refreshMessage('failed', '02:40 PM')).toBe("Couldn't update menus");
  });
});

describe('dropFrame', () => {
  it('rests hidden inside the island before a pull', () => {
    const frame = dropFrame(base);
    expect(frame.centerY).toBeCloseTo(29.5);
    expect(frame.width).toBe(126);
    expect(frame.ink).toBe(1);
    expect(frame.opacity).toBe(0);
  });

  it('turns into the glass bubble centered in the gap at the trigger', () => {
    const frame = dropFrame({ ...base, pull: PULL_TRIGGER });
    expect(frame.centerY).toBeCloseTo(59 + PULL_TRIGGER / 2);
    expect(frame.width).toBe(BUBBLE_SIZE);
    expect(frame.height).toBe(BUBBLE_SIZE);
    expect(frame.ink).toBe(0);
    expect(frame.progress).toBe(1);
    expect(frame.ringOpacity).toBe(1);
  });

  it('drops in from above the screen without an island', () => {
    const start = dropFrame({ ...base, island: null, safeTop: 20, pull: 0 });
    expect(start.centerY).toBeLessThan(0);
    expect(start.ink).toBe(0);
    expect(start.opacity).toBe(0);
    const done = dropFrame({ ...base, island: null, safeTop: 20, pull: PULL_TRIGGER });
    expect(done.centerY).toBeCloseTo(20 + PULL_TRIGGER / 2);
  });

  it('keeps the spinning bubble below the safe area while refreshing', () => {
    const frame = dropFrame({ ...base, spin: 1, pull: 10 });
    expect(frame.centerY).toBe(59 + BUBBLE_SIZE / 2);
    expect(frame.progress).toBe(1);
  });

  it('becomes a pill that floats under the safe area', () => {
    const frame = dropFrame({ ...base, pill: 1, float: 1, pull: 0 });
    expect(frame.width).toBe(190);
    expect(frame.height).toBe(36);
    expect(frame.centerY).toBe(59 + 8 + 18);
    expect(frame.pillOpacity).toBe(1);
    expect(frame.ringOpacity).toBe(0);
  });

  it('retracts into the island and hides at the end', () => {
    const half = dropFrame({ ...base, pill: 1, float: 1, retract: 0.5 });
    expect(half.opacity).toBe(1);
    expect(half.ink).toBeCloseTo(0.5);
    const end = dropFrame({ ...base, pill: 1, float: 1, retract: 1 });
    expect(end.centerY).toBeCloseTo(29.5);
    expect(end.width).toBe(126);
    expect(end.opacity).toBe(0);
  });

  it('fades out on the way up without an island', () => {
    const end = dropFrame({ ...base, island: null, pill: 1, float: 1, retract: 1 });
    expect(end.opacity).toBe(0);
  });
});
