export const SWIPE_TABS = ['(home)', 'map', 'notifications', 'settings'] as const;

export type SwipeTab = (typeof SWIPE_TABS)[number];

export type SwipeDirection = 'previous' | 'next';

export type TabEntry =
  | { kind: 'none' }
  | { kind: 'entering'; tab: SwipeTab; from: 'left' | 'right' };

export const SWIPE_DISTANCE = 64;
export const SWIPE_VELOCITY = 600;
export const DRAG_FOLLOW = 0.3;
export const EDGE_RESISTANCE = 0.08;
export const ENTRY_TRAVEL = 36;

export function neighborTab(tab: SwipeTab, direction: SwipeDirection): SwipeTab | null {
  'worklet';
  const index = SWIPE_TABS.indexOf(tab) + (direction === 'next' ? 1 : -1);
  return SWIPE_TABS[index] ?? null;
}

export function swipeDirection(translationX: number, velocityX: number): SwipeDirection | null {
  'worklet';
  const flicked =
    Math.abs(velocityX) >= SWIPE_VELOCITY && Math.sign(velocityX) === Math.sign(translationX);
  if (Math.abs(translationX) < SWIPE_DISTANCE && !flicked) return null;
  return translationX < 0 ? 'next' : 'previous';
}

export function dragOffset(tab: SwipeTab, translationX: number): number {
  'worklet';
  const direction: SwipeDirection = translationX < 0 ? 'next' : 'previous';
  return translationX * (neighborTab(tab, direction) ? DRAG_FOLLOW : EDGE_RESISTANCE);
}

export function entryFor(from: SwipeTab, direction: SwipeDirection): TabEntry {
  const tab = neighborTab(from, direction);
  if (!tab) return { kind: 'none' };
  return { kind: 'entering', tab, from: direction === 'next' ? 'right' : 'left' };
}
