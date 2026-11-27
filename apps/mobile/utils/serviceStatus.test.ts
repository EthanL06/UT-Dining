import { describe, expect, it } from 'vitest';
import { getServiceStatusBanner, parseServiceStatus } from './serviceStatus';

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

describe('getServiceStatusBanner', () => {
  it('shows nothing when everything works or the status is unknown', () => {
    expect(getServiceStatusBanner({ health: 'operational', label: 'Operational' })).toBeNull();
    expect(getServiceStatusBanner(null)).toBeNull();
    expect(getServiceStatusBanner(undefined)).toBeNull();
  });

  it('warns when something is degraded or down', () => {
    expect(getServiceStatusBanner(parseServiceStatus({ status: 'degraded' }))?.title).toBe(
      "Some things aren't working right",
    );
    expect(getServiceStatusBanner(parseServiceStatus({ status: 'outage' }))?.title).toBe(
      'UT Dining is having problems',
    );
  });
});
