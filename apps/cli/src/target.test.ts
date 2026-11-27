import { describe, expect, it } from 'vitest';
import { matchLocation } from './commands/locations.ts';
import { parseScheduleTime } from './commands/notifications.ts';
import { checkKey, DEV_REF, PROD_REF, resolveTarget } from './target.ts';

const jwt = (claims: Record<string, unknown>) =>
  ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');

const devUrl = `https://${DEV_REF}.supabase.co`;
const prodUrl = `https://${PROD_REF}.supabase.co`;

describe('resolveTarget', () => {
  it('defaults to dev', () => {
    const target = resolveTarget(
      {},
      { SUPABASE_DEV_URL: devUrl, SUPABASE_DEV_SERVICE_KEY: 'sb_secret_x' },
    );
    expect(target.name).toBe('dev');
  });

  it('explains missing keys', () => {
    expect(() => resolveTarget({}, {})).toThrow('SUPABASE_DEV_URL and SUPABASE_DEV_SERVICE_KEY');
    expect(() => resolveTarget({ prod: true }, {})).toThrow('Ask Ethan');
  });

  it('never lets dev point at production', () => {
    expect(() =>
      resolveTarget({}, { SUPABASE_DEV_URL: prodUrl, SUPABASE_DEV_SERVICE_KEY: 'sb_secret_x' }),
    ).toThrow('production');
  });

  it('requires the production ref for --prod', () => {
    expect(() =>
      resolveTarget(
        { prod: true },
        { SUPABASE_PROD_URL: devUrl, SUPABASE_PROD_SERVICE_KEY: 'sb_secret_x' },
      ),
    ).toThrow(PROD_REF);
  });

  it('rejects two targets', () => {
    expect(() => resolveTarget({ dev: true, prod: true }, {})).toThrow('Pick one');
  });
});

describe('checkKey', () => {
  const target = (serviceKey: string) => ({ name: 'dev' as const, url: devUrl, serviceKey });

  it('accepts service role and secret keys', () => {
    expect(() => checkKey(target(jwt({ role: 'service_role', ref: DEV_REF })))).not.toThrow();
    expect(() => checkKey(target('sb_secret_abc'))).not.toThrow();
  });

  it('rejects anon and publishable keys', () => {
    expect(() => checkKey(target(jwt({ role: 'anon', ref: DEV_REF })))).toThrow('anon');
    expect(() => checkKey(target('sb_publishable_abc'))).toThrow('publishable');
    expect(() => checkKey(target('nonsense'))).toThrow('not a Supabase key');
  });

  it('rejects a key from another project', () => {
    expect(() => checkKey(target(jwt({ role: 'service_role', ref: PROD_REF })))).toThrow(
      'belongs to project',
    );
  });
});

describe('matchLocation', () => {
  const locations = [
    { id: '1', name: 'J2 Dining', colloquial_name: 'J2' },
    { id: '2', name: 'JCL Dining', colloquial_name: 'JCL' },
    { id: '3', name: 'Jester City Market', colloquial_name: 'Jarket' },
  ];

  it('matches by id, name, colloquial name and unique part', () => {
    expect(matchLocation(locations, '2').name).toBe('JCL Dining');
    expect(matchLocation(locations, 'j2').id).toBe('1');
    expect(matchLocation(locations, 'city').id).toBe('3');
  });

  it('refuses ambiguous or missing matches', () => {
    expect(() => matchLocation(locations, 'dining')).toThrow('matches 2');
    expect(() => matchLocation(locations, 'kins')).toThrow('No location');
  });
});

describe('parseScheduleTime', () => {
  const now = new Date('2026-11-26T12:00:00Z');

  it('reads Central wall time across DST', () => {
    expect(parseScheduleTime('2026-12-01 09:00', now).toISOString()).toBe(
      '2026-12-01T15:00:00.000Z',
    );
    expect(parseScheduleTime('2027-07-01 09:00', now).toISOString()).toBe(
      '2027-07-01T14:00:00.000Z',
    );
  });

  it('reads ISO times and refuses the past', () => {
    expect(parseScheduleTime('2026-12-01T09:00:00Z', now).toISOString()).toBe(
      '2026-12-01T09:00:00.000Z',
    );
    expect(() => parseScheduleTime('2026-11-01 09:00', now)).toThrow('future');
  });
});
