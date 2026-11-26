import { describe, expect, it } from 'vitest';

import { decideSync, SYNC_INTERVAL_MS, singleFlight } from './sync.ts';

const now = 1_800_000_000_000;

describe('decideSync', () => {
  it('stays on the cache while offline, even when forced or never synced', () => {
    expect(decideSync({ isConnected: false, force: true, lastSyncedAt: null, now })).toEqual({
      kind: 'offline',
    });
  });

  it('syncs on a manual request even when the cache is fresh', () => {
    expect(decideSync({ isConnected: true, force: true, lastSyncedAt: now - 1000, now })).toEqual({
      kind: 'sync',
      reason: 'manual',
    });
  });

  it('syncs when it has never synced', () => {
    expect(decideSync({ isConnected: true, force: false, lastSyncedAt: null, now })).toEqual({
      kind: 'sync',
      reason: 'never-synced',
    });
  });

  it('keeps the cache until the interval has passed', () => {
    const lastSyncedAt = now - SYNC_INTERVAL_MS + 1;
    expect(decideSync({ isConnected: true, force: false, lastSyncedAt, now })).toEqual({
      kind: 'fresh',
      ageMs: SYNC_INTERVAL_MS - 1,
    });
  });

  it('syncs once the interval has passed exactly', () => {
    const lastSyncedAt = now - SYNC_INTERVAL_MS;
    expect(decideSync({ isConnected: true, force: false, lastSyncedAt, now })).toEqual({
      kind: 'sync',
      reason: 'stale',
    });
  });

  it('accepts a custom interval', () => {
    expect(
      decideSync({ isConnected: true, force: false, lastSyncedAt: now - 10, now, intervalMs: 10 }),
    ).toEqual({ kind: 'sync', reason: 'stale' });
  });

  it('syncs when the stored time is in the future, as after a clock change', () => {
    expect(decideSync({ isConnected: true, force: false, lastSyncedAt: now + 5000, now })).toEqual({
      kind: 'sync',
      reason: 'stale',
    });
  });
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('singleFlight', () => {
  it('shares one run between concurrent callers', async () => {
    const gate = deferred<string>();
    let calls = 0;
    const run = singleFlight(() => {
      calls++;
      return gate.promise;
    });

    const first = run();
    const second = run();
    expect(second).toBe(first);
    gate.resolve('done');
    await expect(Promise.all([first, second])).resolves.toEqual(['done', 'done']);
    expect(calls).toBe(1);
  });

  it('starts a new run after the previous one settles', async () => {
    let calls = 0;
    const run = singleFlight(async () => ++calls);

    await expect(run()).resolves.toBe(1);
    await expect(run()).resolves.toBe(2);
  });

  it('gives every concurrent caller the same failure and recovers afterwards', async () => {
    const gate = deferred<number>();
    let calls = 0;
    const run = singleFlight(() => (++calls === 1 ? gate.promise : Promise.resolve(calls)));

    const first = run();
    const second = run();
    gate.reject(new Error('network down'));
    await expect(first).rejects.toThrow('network down');
    await expect(second).rejects.toThrow('network down');
    await expect(run()).resolves.toBe(2);
  });

  it('runs with the arguments of the call that started the flight', async () => {
    const gate = deferred<void>();
    const seen: string[] = [];
    const run = singleFlight(async (label: string) => {
      seen.push(label);
      await gate.promise;
      return label;
    });

    const first = run('a');
    const second = run('b');
    gate.resolve();
    await expect(Promise.all([first, second])).resolves.toEqual(['a', 'a']);
    expect(seen).toEqual(['a']);
  });
});
