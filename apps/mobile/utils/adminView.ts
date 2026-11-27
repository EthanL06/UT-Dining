import { formatCentral } from '@ut-dining/core';

export type QueryView<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: T };

export const toQueryView = <T>(query: {
  isPending: boolean;
  isError: boolean;
  data: T | undefined;
}): QueryView<T> => {
  if (query.data !== undefined) return { status: 'ready', data: query.data };
  if (query.isError) return { status: 'error' };
  return { status: 'loading' };
};

export type RunLabel = 'Running' | 'Queued' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Finished';

export const runLabel = (run: { status: string; conclusion: string | null }): RunLabel => {
  if (run.status === 'queued' || run.status === 'waiting' || run.status === 'pending') {
    return 'Queued';
  }
  if (run.status !== 'completed') return 'Running';
  switch (run.conclusion) {
    case 'success':
      return 'Succeeded';
    case 'failure':
    case 'timed_out':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Finished';
  }
};

export const formatAgo = (instant: string | null, now = Date.now()): string => {
  if (!instant) return 'Never';
  const minutes = Math.floor((now - new Date(instant).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatCentral(instant, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatBytes = (bytes: number | null): string => {
  if (bytes === null) return 'Unknown';
  if (bytes < 1e6) return `${Math.round(bytes / 1e3)} KB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
};
