import { describe, expect, it } from 'vitest';
import {
  checkChangelogChanges,
  compareVersions,
  isChangelogIcon,
  isValidVersion,
} from './changelog.ts';

describe('versions', () => {
  it('accepts only x.y.z and compares numerically', () => {
    expect(isValidVersion('2.0.0')).toBe(true);
    expect(isValidVersion('2.0')).toBe(false);
    expect(isValidVersion('v2.0.0')).toBe(false);
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });
});

describe('checkChangelogChanges', () => {
  it('trims, defaults the icon and drops empty descriptions', () => {
    expect(
      checkChangelogChanges([
        { title: ' New design ', description: ' Redrawn. ', icon: 'palette' },
        { title: 'Faster', description: '  ' },
      ]),
    ).toEqual({
      ok: true,
      value: [
        { icon: 'palette', title: 'New design', description: 'Redrawn.' },
        { icon: 'sparkles', title: 'Faster' },
      ],
    });
  });

  it('rejects a missing title, an unknown icon and a non-list', () => {
    expect(checkChangelogChanges([{ title: '' }])).toEqual({
      ok: false,
      error: 'Change 1 needs a title.',
    });
    expect(checkChangelogChanges([{ title: 'x', icon: 'nope' }]).ok).toBe(false);
    expect(checkChangelogChanges('x').ok).toBe(false);
    expect(isChangelogIcon('wifi-off')).toBe(true);
  });

  it('requires a change only when asked', () => {
    expect(checkChangelogChanges([]).ok).toBe(true);
    expect(checkChangelogChanges([], { requireOne: true })).toEqual({
      ok: false,
      error: 'Add at least one change.',
    });
  });
});
