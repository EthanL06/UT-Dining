import { describe, expect, it } from 'vitest';

import { containsPattern } from './search';

describe('containsPattern', () => {
  it('wraps plain text in wildcards', () => {
    expect(containsPattern('taco')).toBe('%taco%');
  });

  it('escapes LIKE wildcards so they match literally', () => {
    expect(containsPattern('100%')).toBe('%100\\%%');
    expect(containsPattern('a_b')).toBe('%a\\_b%');
    expect(containsPattern('c:\\')).toBe('%c:\\\\%');
  });
});
