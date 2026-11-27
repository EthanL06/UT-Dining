import { describe, expect, it } from 'vitest';
import { pruneOldMenus } from './retention.ts';

describe('pruneOldMenus', () => {
  it('keeps deleting batches until one comes back short', async () => {
    const counts = [3, 3, 1];
    const calls: [number, number][] = [];
    const result = await pruneOldMenus(
      async (keepDays, limit) => {
        calls.push([keepDays, limit]);
        return { data: counts.shift() ?? 0, error: null };
      },
      90,
      3,
      0,
    );
    expect(result).toEqual({ status: 'done', removed: 7 });
    expect(calls).toEqual([
      [90, 3],
      [90, 3],
      [90, 3],
    ]);
  });

  it('stops after one call when nothing is old enough', async () => {
    let calls = 0;
    const result = await pruneOldMenus(
      async () => {
        calls++;
        return { data: 0, error: null };
      },
      90,
      3,
      0,
    );
    expect(calls).toBe(1);
    expect(result).toEqual({ status: 'done', removed: 0 });
  });

  it('reports what it removed before an error', async () => {
    const responses = [
      { data: 3, error: null },
      { data: null, error: { message: 'timeout' } },
      { data: null, error: { message: 'timeout' } },
      { data: null, error: { message: 'timeout' } },
    ];
    const result = await pruneOldMenus(
      async () => responses.shift() ?? { data: 0, error: null },
      90,
      3,
      0,
    );
    expect(result).toEqual({ status: 'failed', removed: 3, error: 'timeout' });
  });
});
