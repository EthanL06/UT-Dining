import { describe, expect, it } from 'vitest';
import { withRetry } from './upload.ts';

describe('withRetry', () => {
  it('retries an RPC error until it succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        return calls < 3 ? { data: null, error: { message: 'timeout' } } : { data: 5, error: null };
      },
      3,
      0,
    );
    expect(calls).toBe(3);
    expect(result).toEqual({ data: 5, error: null });
  });

  it('returns the last error after the final attempt', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        return { data: null, error: { message: `fail ${calls}` } };
      },
      2,
      0,
    );
    expect(calls).toBe(2);
    expect(result.error?.message).toBe('fail 2');
  });

  it('does not retry a success', async () => {
    let calls = 0;
    await withRetry(async () => {
      calls++;
      return { data: 1, error: null };
    });
    expect(calls).toBe(1);
  });
});
