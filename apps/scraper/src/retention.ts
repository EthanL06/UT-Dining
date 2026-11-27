import { withRetry } from './upload.ts';

type PruneRpc = (
  keepDays: number,
  limit: number,
) => PromiseLike<{ data: number | null; error: { message: string } | null }>;

export type RetentionResult =
  | { status: 'done'; removed: number }
  | { status: 'failed'; removed: number; error: string };

export const PRUNE_BATCH = 200;
const MAX_BATCHES = 500;

export const pruneOldMenus = async (
  prune: PruneRpc,
  keepDays: number,
  batch = PRUNE_BATCH,
  delayMs = 1000,
): Promise<RetentionResult> => {
  let removed = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const { data, error } = await withRetry(() => prune(keepDays, batch), undefined, delayMs);
    if (error) return { status: 'failed', removed, error: error.message };
    const count = data ?? 0;
    removed += count;
    if (count < batch) return { status: 'done', removed };
  }
  return { status: 'done', removed };
};
