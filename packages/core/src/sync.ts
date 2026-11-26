export const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type SyncReason = 'manual' | 'never-synced' | 'stale';

export type SyncDecision =
  | { kind: 'offline' }
  | { kind: 'fresh'; ageMs: number }
  | { kind: 'sync'; reason: SyncReason };

export interface SyncInput {
  isConnected: boolean;
  force: boolean;
  lastSyncedAt: number | null;
  now: number;
  intervalMs?: number;
}

export const decideSync = ({
  isConnected,
  force,
  lastSyncedAt,
  now,
  intervalMs = SYNC_INTERVAL_MS,
}: SyncInput): SyncDecision => {
  if (!isConnected) return { kind: 'offline' };
  if (force) return { kind: 'sync', reason: 'manual' };
  if (lastSyncedAt === null) return { kind: 'sync', reason: 'never-synced' };
  const ageMs = now - lastSyncedAt;
  if (ageMs < 0 || ageMs >= intervalMs) return { kind: 'sync', reason: 'stale' };
  return { kind: 'fresh', ageMs };
};

export const singleFlight = <Args extends unknown[], T>(
  run: (...args: Args) => Promise<T>,
): ((...args: Args) => Promise<T>) => {
  let inFlight: Promise<T> | null = null;
  return (...args) => {
    if (!inFlight) {
      inFlight = run(...args).finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
};
