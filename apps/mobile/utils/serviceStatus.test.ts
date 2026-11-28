import { describe, expect, it } from 'vitest';
import { getStatusToast, parseServiceStatus, previewServiceStatus } from './serviceStatus';

const NOW = Date.UTC(2026, 10, 28, 21, 0);
const HOUR = 60 * 60 * 1000;

const status = (health: string, components: { id: string; status: string }[] = []) =>
  parseServiceStatus({ status: health, components });

describe('parseServiceStatus', () => {
  it('reads a known status and its parts', () => {
    expect(
      parseServiceStatus({
        status: 'degraded',
        components: [
          { id: 'menus', status: 'degraded' },
          { id: 'app', status: 'operational' },
          { id: 'website', status: 'unknown' },
          { id: 'other', status: 'outage' },
          null,
        ],
      }),
    ).toEqual({
      health: 'degraded',
      label: 'Partly Working',
      parts: { menus: 'degraded', app: 'operational' },
    });
    expect(parseServiceStatus({ status: 'outage' })).toEqual({
      health: 'outage',
      label: 'Down',
      parts: {},
    });
  });

  it('hides unknown or malformed answers', () => {
    expect(parseServiceStatus({ status: 'unknown' })).toBeNull();
    expect(parseServiceStatus({})).toBeNull();
    expect(parseServiceStatus(null)).toBeNull();
    expect(parseServiceStatus('operational')).toBeNull();
  });
});

describe('getStatusToast', () => {
  it('shows nothing when everything works or the status is unknown', () => {
    expect(getStatusToast(status('operational'), null, NOW)).toBeNull();
    expect(getStatusToast(null, null, NOW)).toBeNull();
    expect(getStatusToast(undefined, null, NOW)).toBeNull();
  });

  it('shows nothing when only the website has a problem', () => {
    const websiteDown = status('outage', [
      { id: 'menus', status: 'operational' },
      { id: 'app', status: 'operational' },
      { id: 'website', status: 'outage' },
    ]);
    expect(getStatusToast(websiteDown, null, NOW)).toBeNull();
  });

  it('says menus are behind when only menus are partly working', () => {
    const toast = getStatusToast(
      status('degraded', [
        { id: 'menus', status: 'degraded' },
        { id: 'app', status: 'operational' },
      ]),
      NOW - 2 * HOUR,
      NOW,
    );
    expect(toast).toEqual({
      kind: 'menus-behind',
      health: 'degraded',
      title: 'Menus are running behind',
      detail: "Some menus may be out of date. We're fixing it.",
    });
  });

  it('says the app is slow when the app service is partly working', () => {
    const toast = getStatusToast(
      status('degraded', [
        { id: 'menus', status: 'degraded' },
        { id: 'app', status: 'degraded' },
      ]),
      null,
      NOW,
    );
    expect(toast?.kind).toBe('slow');
    expect(toast?.title).toBe('UT Dining is running slow');
  });

  it('says how old the menus are when the app service is down', () => {
    const down = status('outage', [{ id: 'app', status: 'outage' }]);
    expect(getStatusToast(down, NOW - 2 * HOUR, NOW)).toEqual({
      kind: 'down',
      health: 'outage',
      title: "We can't get new menus right now",
      detail: "You're seeing menus from 2 hours ago. We're working on it.",
    });
    expect(getStatusToast(down, NOW - 20_000, NOW)?.detail).toBe(
      "You're seeing the last menus we got. We're working on it.",
    );
    expect(getStatusToast(down, null, NOW)?.detail).toBe(
      "You're seeing the last menus we got. We're working on it.",
    );
  });

  it('treats menus that are down as down', () => {
    const toast = getStatusToast(
      status('outage', [
        { id: 'menus', status: 'outage' },
        { id: 'app', status: 'operational' },
      ]),
      null,
      NOW,
    );
    expect(toast?.kind).toBe('down');
  });

  it('falls back to the overall status when no parts are listed', () => {
    expect(getStatusToast(status('degraded'), null, NOW)?.kind).toBe('menus-behind');
    expect(getStatusToast(status('outage'), null, NOW)?.kind).toBe('down');
  });
});

describe('previewServiceStatus', () => {
  it('builds a status that shows each toast', () => {
    expect(previewServiceStatus('off')).toBeNull();
    expect(getStatusToast(previewServiceStatus('menus-behind'), null, NOW)?.kind).toBe(
      'menus-behind',
    );
    expect(getStatusToast(previewServiceStatus('slow'), null, NOW)?.kind).toBe('slow');
    expect(getStatusToast(previewServiceStatus('down'), null, NOW)?.kind).toBe('down');
  });
});
