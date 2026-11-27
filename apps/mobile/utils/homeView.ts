export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'failed';

export type HomeView =
  | { kind: 'loading' }
  | { kind: 'cache-error' }
  | { kind: 'first-sync' }
  | { kind: 'first-sync-failed' }
  | { kind: 'ready'; syncProblem: 'offline' | 'failed' | null };

export const toSyncStatus = (query: {
  fetchStatus: 'fetching' | 'paused' | 'idle';
  isError: boolean;
}): SyncStatus => {
  if (query.fetchStatus === 'paused') return 'offline';
  if (query.fetchStatus === 'fetching') return 'syncing';
  return query.isError ? 'failed' : 'idle';
};

export const homeView = ({
  cache,
  locationCount,
  sync,
}: {
  cache: 'pending' | 'error' | 'success';
  locationCount: number;
  sync: SyncStatus;
}): HomeView => {
  if (cache === 'pending') return { kind: 'loading' };
  if (cache === 'error') return { kind: 'cache-error' };
  if (locationCount === 0 && sync === 'syncing') return { kind: 'first-sync' };
  if (locationCount === 0 && (sync === 'offline' || sync === 'failed')) {
    return { kind: 'first-sync-failed' };
  }
  return { kind: 'ready', syncProblem: sync === 'offline' || sync === 'failed' ? sync : null };
};
