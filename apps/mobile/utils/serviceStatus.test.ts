import { describe, expect, it } from 'vitest';
import { parseServiceStatus } from './serviceStatus';

describe('parseServiceStatus', () => {
  it('reads a known status', () => {
    expect(parseServiceStatus({ status: 'operational', label: 'Operational' })).toEqual({
      health: 'operational',
      label: 'Operational',
    });
    expect(parseServiceStatus({ status: 'outage' })?.label).toBe('Down');
  });

  it('hides unknown or malformed answers', () => {
    expect(parseServiceStatus({ status: 'unknown' })).toBeNull();
    expect(parseServiceStatus({})).toBeNull();
    expect(parseServiceStatus(null)).toBeNull();
    expect(parseServiceStatus('operational')).toBeNull();
  });
});
