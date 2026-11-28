import { describe, expect, it } from 'vitest';
import {
  DRAG_FOLLOW,
  dragOffset,
  EDGE_RESISTANCE,
  entryFor,
  neighborTab,
  SWIPE_DISTANCE,
  SWIPE_VELOCITY,
  swipeDirection,
} from './tabSwipe';

describe('neighborTab', () => {
  it('walks Home, Map, Notifications, Settings in tab bar order', () => {
    expect(neighborTab('(home)', 'next')).toBe('map');
    expect(neighborTab('map', 'next')).toBe('notifications');
    expect(neighborTab('notifications', 'next')).toBe('settings');
    expect(neighborTab('settings', 'previous')).toBe('notifications');
    expect(neighborTab('map', 'previous')).toBe('(home)');
  });

  it('stops at the ends instead of wrapping', () => {
    expect(neighborTab('(home)', 'previous')).toBeNull();
    expect(neighborTab('settings', 'next')).toBeNull();
  });
});

describe('swipeDirection', () => {
  it('goes to the next tab when the finger moves left far enough', () => {
    expect(swipeDirection(-SWIPE_DISTANCE, 0)).toBe('next');
    expect(swipeDirection(SWIPE_DISTANCE, 0)).toBe('previous');
  });

  it('accepts a short quick flick', () => {
    expect(swipeDirection(-20, -SWIPE_VELOCITY)).toBe('next');
    expect(swipeDirection(20, SWIPE_VELOCITY)).toBe('previous');
  });

  it('cancels a short slow drag', () => {
    expect(swipeDirection(-SWIPE_DISTANCE + 1, -100)).toBeNull();
  });

  it('cancels a drag that is flung back toward where it started', () => {
    expect(swipeDirection(-30, SWIPE_VELOCITY * 2)).toBeNull();
  });
});

describe('dragOffset', () => {
  it('follows the finger partway when there is a tab on that side', () => {
    expect(dragOffset('map', -100)).toBeCloseTo(-100 * DRAG_FOLLOW);
    expect(dragOffset('map', 100)).toBeCloseTo(100 * DRAG_FOLLOW);
  });

  it('barely moves past the first and last tab', () => {
    expect(dragOffset('(home)', 100)).toBeCloseTo(100 * EDGE_RESISTANCE);
    expect(dragOffset('settings', -100)).toBeCloseTo(-100 * EDGE_RESISTANCE);
  });
});

describe('entryFor', () => {
  it('slides the next tab in from the right', () => {
    expect(entryFor('(home)', 'next')).toEqual({ kind: 'entering', tab: 'map', from: 'right' });
  });

  it('slides the previous tab in from the left', () => {
    expect(entryFor('settings', 'previous')).toEqual({
      kind: 'entering',
      tab: 'notifications',
      from: 'left',
    });
  });

  it('has no entry past the ends', () => {
    expect(entryFor('settings', 'next')).toEqual({ kind: 'none' });
  });
});
