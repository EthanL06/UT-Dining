import { describe, expect, it } from 'vitest';

import { homeView, toSyncStatus } from './homeView';

describe('toSyncStatus', () => {
  it('reads a paused query as offline before anything else', () => {
    expect(toSyncStatus({ fetchStatus: 'paused', isError: true })).toBe('offline');
  });

  it('reads a running query as syncing, even after an earlier failure', () => {
    expect(toSyncStatus({ fetchStatus: 'fetching', isError: true })).toBe('syncing');
  });

  it('reads an idle query from its last result', () => {
    expect(toSyncStatus({ fetchStatus: 'idle', isError: true })).toBe('failed');
    expect(toSyncStatus({ fetchStatus: 'idle', isError: false })).toBe('idle');
  });
});

describe('homeView', () => {
  it('waits for the cache first', () => {
    expect(homeView({ cache: 'pending', locationCount: 0, sync: 'syncing' })).toEqual({
      kind: 'loading',
    });
    expect(homeView({ cache: 'error', locationCount: 5, sync: 'idle' })).toEqual({
      kind: 'cache-error',
    });
  });

  it('keeps the loading skeleton when QA forces it', () => {
    expect(
      homeView({ cache: 'success', locationCount: 5, sync: 'idle', forceSkeletons: true }),
    ).toEqual({ kind: 'first-sync' });
  });

  it('shows the first sync on an empty cache', () => {
    expect(homeView({ cache: 'success', locationCount: 0, sync: 'syncing' })).toEqual({
      kind: 'first-sync',
    });
    expect(homeView({ cache: 'success', locationCount: 0, sync: 'offline' })).toEqual({
      kind: 'first-sync-failed',
    });
    expect(homeView({ cache: 'success', locationCount: 0, sync: 'failed' })).toEqual({
      kind: 'first-sync-failed',
    });
  });

  it('keeps showing cached places when a later sync fails', () => {
    expect(homeView({ cache: 'success', locationCount: 5, sync: 'failed' })).toEqual({
      kind: 'ready',
      syncProblem: 'failed',
    });
    expect(homeView({ cache: 'success', locationCount: 5, sync: 'syncing' })).toEqual({
      kind: 'ready',
      syncProblem: null,
    });
  });
});
