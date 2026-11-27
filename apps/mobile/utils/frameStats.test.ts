import { describe, expect, it } from 'vitest';

import { type FrameBatch, frameStats, refreshInterval, toEpochTimes } from './frameStats';

const steady = (start: number, count: number, interval: number) =>
  Array.from({ length: count }, (_, index) => start + index * interval);

describe('refreshInterval', () => {
  it('snaps to the nearest common refresh rate', () => {
    expect(refreshInterval([16.4, 16.9, 16.7, 33.4])).toBeCloseTo(1000 / 60);
    expect(refreshInterval([8.2, 8.4, 8.3, 16.6])).toBeCloseTo(1000 / 120);
  });

  it('falls back to 60 Hz without frames', () => {
    expect(refreshInterval([])).toBeCloseTo(1000 / 60);
  });
});

describe('frameStats', () => {
  it('counts no drops for a steady 60 Hz second', () => {
    const stats = frameStats(steady(0, 60, 1000 / 60), 0, 1000);
    expect(stats).toMatchObject({ frames: 60, refreshHz: 60, dropped: 0, hitches: 0 });
    expect(stats.fps).toBe(60);
  });

  it('counts each missed vsync of a long frame', () => {
    const times = [...steady(0, 30, 1000 / 60), 29 * (1000 / 60) + 50];
    const stats = frameStats(times, 0, 1000);
    expect(stats.dropped).toBe(2);
    expect(stats.hitches).toBe(1);
    expect(stats.worstMs).toBe(50);
    expect(stats.hitchMsPerSecond).toBeCloseTo(33.3, 1);
  });

  it('only reads frames inside the window', () => {
    const times = [...steady(0, 10, 10), 5000, 5500];
    expect(frameStats(times, 0, 100).frames).toBe(10);
  });
});

describe('toEpochTimes', () => {
  it('maps each batch from its own clock to wall time and sorts across batches', () => {
    const batches: FrameBatch[] = [
      { thread: 'ui', epoch: 2000, clock: 100, frames: [90, 100] },
      { thread: 'ui', epoch: 1000, clock: 50, frames: [40, 50] },
      { thread: 'js', epoch: 1000, clock: 0, frames: [0] },
    ];
    expect(toEpochTimes(batches, 'ui')).toEqual([990, 1000, 1990, 2000]);
    expect(toEpochTimes(batches, 'js')).toEqual([1000]);
  });
});
