export type RefreshResult = 'updated' | 'offline' | 'failed';

export type RefreshStatus =
  | { kind: 'idle' }
  | { kind: 'refreshing' }
  | { kind: 'settled'; result: RefreshResult; at: number };

export type Island = { top: number; width: number; height: number };

export type DropInput = {
  pull: number;
  safeTop: number;
  island: Island | null;
  spin: number;
  pill: number;
  float: number;
  retract: number;
  pillWidth: number;
  pillHeight: number;
};

export type DropFrame = {
  centerY: number;
  width: number;
  height: number;
  ink: number;
  opacity: number;
  ringOpacity: number;
  pillOpacity: number;
  progress: number;
};

export const PULL_TRIGGER = 88;
export const BUBBLE_SIZE = 40;
const FLOAT_GAP = 8;
const ISLAND_MIN_SAFE_TOP = 54;
const ISLAND_WIDTH = 126;
const ISLAND_HEIGHT = 37;
const ISLAND_OFFSET_FROM_SAFE_TOP = 48;

export function islandFor(os: string, safeTop: number): Island | null {
  if (os !== 'ios' || safeTop < ISLAND_MIN_SAFE_TOP) return null;
  return {
    top: safeTop - ISLAND_OFFSET_FROM_SAFE_TOP,
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
  };
}

export function refreshMessage(result: RefreshResult, timeLabel: string): string {
  switch (result) {
    case 'updated':
      return `Menus updated ${timeLabel}`;
    case 'offline':
      return "You're offline";
    case 'failed':
      return "Couldn't update menus";
  }
}

const clamp01 = (value: number) => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

const lerp = (from: number, to: number, t: number) => {
  'worklet';
  return from + (to - from) * t;
};

const easeOut = (t: number) => {
  'worklet';
  return 1 - (1 - clamp01(t)) ** 3;
};

export function dropFrame(input: DropInput): DropFrame {
  'worklet';
  const { pull, safeTop, island, spin, pill, float, retract, pillWidth, pillHeight } = input;
  const start = island
    ? { y: island.top + island.height / 2, width: island.width, height: island.height, ink: 1 }
    : { y: -BUBBLE_SIZE / 2 - 4, width: BUBBLE_SIZE, height: BUBBLE_SIZE, ink: 0 };
  const gapY = safeTop + Math.max(0, pull) / 2;
  const floatY = safeTop + FLOAT_GAP + pillHeight / 2;
  const progress = clamp01(pull / PULL_TRIGGER);

  if (retract > 0) {
    const t = clamp01(retract);
    return {
      centerY: lerp(floatY, start.y, t),
      width: lerp(pillWidth, start.width, t),
      height: lerp(pillHeight, start.height, t),
      ink: start.ink * t,
      opacity: t >= 1 ? 0 : 1,
      ringOpacity: 0,
      pillOpacity: clamp01(1 - t * 2.5),
      progress: 1,
    };
  }

  if (pill > 0) {
    const t = clamp01(pill);
    return {
      centerY: lerp(gapY, floatY, clamp01(float)),
      width: lerp(BUBBLE_SIZE, pillWidth, t),
      height: lerp(BUBBLE_SIZE, pillHeight, t),
      ink: 0,
      opacity: 1,
      ringOpacity: 1 - t,
      pillOpacity: clamp01((t - 0.4) / 0.6),
      progress: 1,
    };
  }

  if (spin > 0) {
    return {
      centerY: Math.max(gapY, safeTop + BUBBLE_SIZE / 2),
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      ink: 0,
      opacity: 1,
      ringOpacity: 1,
      pillOpacity: 0,
      progress: 1,
    };
  }

  const travel = easeOut(progress / 0.85);
  const stretch = progress < 1 ? Math.sin(Math.PI * progress) * 8 : 0;
  const ink = start.ink * (1 - clamp01((progress - 0.15) / 0.45));
  return {
    centerY: lerp(start.y, gapY, travel),
    width: lerp(start.width, BUBBLE_SIZE, clamp01(progress / 0.5)),
    height: lerp(start.height, BUBBLE_SIZE, clamp01(progress / 0.6)) + stretch,
    ink,
    opacity: pull > 1 ? 1 : 0,
    ringOpacity: clamp01(1 - ink * 2),
    pillOpacity: 0,
    progress,
  };
}
