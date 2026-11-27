export type FrameThread = 'ui' | 'js';

export type FrameBatch = {
  thread: FrameThread;
  epoch: number;
  clock: number;
  frames: number[];
};

export type FrameStats = {
  frames: number;
  seconds: number;
  fps: number;
  refreshHz: number;
  dropped: number;
  hitches: number;
  worstMs: number;
  hitchMsPerSecond: number;
};

const REFRESH_RATES = [120, 90, 60, 30];

export const toEpochTimes = (batches: FrameBatch[], thread: FrameThread) =>
  batches
    .filter((batch) => batch.thread === thread)
    .flatMap((batch) => batch.frames.map((time) => batch.epoch - batch.clock + time))
    .sort((a, b) => a - b);

const intervalsOf = (times: number[]) => times.slice(1).map((time, index) => time - times[index]);

export const refreshInterval = (intervals: number[]) => {
  if (intervals.length === 0) return 1000 / 60;
  const sorted = [...intervals].sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length * 0.1)];
  const nearest = REFRESH_RATES.reduce((best, rate) =>
    Math.abs(1000 / rate - typical) < Math.abs(1000 / best - typical) ? rate : best,
  );
  return 1000 / nearest;
};

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const frameStats = (times: number[], from: number, to: number): FrameStats => {
  const inWindow = times.filter((time) => time >= from && time <= to);
  const intervals = intervalsOf(inWindow);
  const interval = refreshInterval(intervals);
  const seconds = Math.max((to - from) / 1000, 0.001);
  let dropped = 0;
  let hitches = 0;
  let hitchMs = 0;
  let worstMs = 0;
  for (const delta of intervals) {
    worstMs = Math.max(worstMs, delta);
    const missed = Math.round(delta / interval) - 1;
    if (missed > 0) {
      dropped += missed;
      hitches += 1;
      hitchMs += delta - interval;
    }
  }
  return {
    frames: inWindow.length,
    seconds: round(seconds, 2),
    fps: round(inWindow.length / seconds),
    refreshHz: Math.round(1000 / interval),
    dropped,
    hitches,
    worstMs: round(worstMs),
    hitchMsPerSecond: round(hitchMs / seconds),
  };
};
