import { describe, expect, it } from 'vitest';

import { isNewerVersion } from './version';

describe('isNewerVersion', () => {
  it.each([
    ['1.2.4', '2.0.0', true],
    ['1.2.4', '1.3.0', true],
    ['1.2.4', '1.2.5', true],
    ['1.2', '1.2.1', true],
    ['2.0.0', '2.0.0', false],
    ['2.0.0', '2.0', false],
    ['2.0.0', '1.9.9', false],
    ['1.10.0', '1.9.0', false],
  ])('%s -> %s is %s', (current, candidate, expected) => {
    expect(isNewerVersion(current, candidate)).toBe(expected);
  });
});
