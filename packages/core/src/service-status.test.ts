import { describe, expect, it } from 'vitest';

import { parseServiceHealth } from './service-status.ts';

describe('parseServiceHealth', () => {
  it('reads a known status', () => {
    expect(parseServiceHealth({ status: 'operational', label: 'Operational' })).toBe('operational');
    expect(parseServiceHealth({ status: 'degraded' })).toBe('degraded');
    expect(parseServiceHealth({ status: 'outage' })).toBe('outage');
  });

  it('hides unknown or malformed answers', () => {
    expect(parseServiceHealth({ status: 'unknown' })).toBeNull();
    expect(parseServiceHealth({})).toBeNull();
    expect(parseServiceHealth(null)).toBeNull();
    expect(parseServiceHealth('operational')).toBeNull();
  });
});
