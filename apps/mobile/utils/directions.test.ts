import { describe, expect, it } from 'vitest';
import { directionsUrl } from './directions';

describe('directionsUrl', () => {
  it('uses the saved maps link when there is one', () => {
    expect(
      directionsUrl({ link: 'https://maps.apple.com/?q=J2', latitude: 1, longitude: 2 }, 'ios'),
    ).toBe('https://maps.apple.com/?q=J2');
  });

  it('falls back to coordinates when the link is empty', () => {
    expect(directionsUrl({ link: '', latitude: 30.28, longitude: -97.73 }, 'ios')).toBe(
      'maps://?daddr=30.28%2C-97.73&dirflg=w',
    );
    expect(directionsUrl({ link: ' ', latitude: 30.28, longitude: -97.73 }, 'android')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=30.28%2C-97.73&travelmode=walking',
    );
  });

  it('falls back to the address without coordinates', () => {
    expect(directionsUrl({ address: '2400 Whitis Ave' }, 'ios')).toBe(
      'maps://?daddr=2400%20Whitis%20Ave&dirflg=w',
    );
  });

  it('returns null when there is nothing to route to', () => {
    expect(directionsUrl({ link: '', address: '' }, 'ios')).toBeNull();
  });
});
