import { describe, expect, it } from 'vitest';

import { chunk, fetchAllPages, mapConcurrent } from './paging.ts';

const serverWith = (total: number, cap: number) => {
  const rows = Array.from({ length: total }, (_, id) => ({ id }));
  const calls: [number, number][] = [];
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null };
  };
  return { rows, calls, fetchPage };
};

describe('fetchAllPages', () => {
  it('reads every row past a 1000-row response cap', async () => {
    const server = serverWith(2122, 1000);
    const result = await fetchAllPages(server.fetchPage);
    expect(result.error).toBeNull();
    expect(result.data).toEqual(server.rows);
    expect(server.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('asks for one more page when the total is an exact multiple of the page size', async () => {
    const server = serverWith(2000, 1000);
    const result = await fetchAllPages(server.fetchPage);
    expect(result.data).toHaveLength(2000);
    expect(server.calls).toHaveLength(3);
  });

  it('returns an empty list when there are no rows', async () => {
    const server = serverWith(0, 1000);
    expect(await fetchAllPages(server.fetchPage)).toEqual({ data: [], error: null });
  });

  it('stops at the first error and drops partial rows', async () => {
    let calls = 0;
    const result = await fetchAllPages(async () => {
      calls += 1;
      return calls === 1
        ? { data: Array.from({ length: 10 }, (_, id) => ({ id })), error: null }
        : { data: null, error: 'timeout' };
    }, 10);
    expect(result).toEqual({ data: null, error: 'timeout' });
    expect(calls).toBe(2);
  });
});

describe('chunk', () => {
  it('splits into groups of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe('mapConcurrent', () => {
  it('keeps the input order and never runs more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    const result = await mapConcurrent([30, 10, 20, 5, 15], 2, async (ms, index) => {
      running += 1;
      peak = Math.max(peak, running);
      for (let tick = 0; tick < ms; tick += 1) await Promise.resolve();
      running -= 1;
      return index;
    });
    expect(result).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it('returns an empty list for no items', async () => {
    expect(await mapConcurrent([], 4, async () => 1)).toEqual([]);
  });
});
