import { describe, expect, it } from 'vitest';
import {
  decideRatingPrompt,
  favoritesTrigger,
  menuHasFavorite,
  type RatingPromptHistory,
} from './ratingPrompt';

const DAY = 24 * 60 * 60 * 1000;
const first = Date.UTC(2026, 10, 20);

const eligible: RatingPromptHistory = {
  launchCount: 3,
  firstLaunchTimestamp: first,
  lastRatingPrompt: null,
};

const decide = (
  overrides: Partial<{
    history: RatingPromptHistory;
    appVersion: string;
    isOnboardingComplete: boolean;
    isOnline: boolean;
    now: number;
  }> = {},
) =>
  decideRatingPrompt({
    history: eligible,
    appVersion: '2.0.0',
    isOnboardingComplete: true,
    isOnline: true,
    now: first + 3 * DAY,
    ...overrides,
  });

describe('decideRatingPrompt', () => {
  it('shows on the third launch three days in', () => {
    expect(decide()).toEqual({ kind: 'show' });
  });

  it('waits on the second launch right after onboarding', () => {
    expect(decide({ history: { ...eligible, launchCount: 2 }, now: first + 60_000 })).toEqual({
      kind: 'skip',
      reason: 'too_new',
    });
  });

  it('waits for three days even after many launches', () => {
    expect(decide({ history: { ...eligible, launchCount: 9 }, now: first + 2 * DAY })).toEqual({
      kind: 'skip',
      reason: 'too_new',
    });
  });

  it('waits for a third launch after three days', () => {
    expect(decide({ history: { ...eligible, launchCount: 2 }, now: first + 5 * DAY })).toEqual({
      kind: 'skip',
      reason: 'too_new',
    });
  });

  it('needs a first launch time', () => {
    expect(decide({ history: { ...eligible, firstLaunchTimestamp: null } })).toEqual({
      kind: 'skip',
      reason: 'too_new',
    });
  });

  it('never shows during onboarding', () => {
    expect(decide({ isOnboardingComplete: false })).toEqual({ kind: 'skip', reason: 'onboarding' });
  });

  it('never shows offline', () => {
    expect(decide({ isOnline: false })).toEqual({ kind: 'skip', reason: 'offline' });
  });

  it('shows at most once per version', () => {
    expect(
      decide({
        history: { ...eligible, lastRatingPrompt: { version: '2.0.0', at: first } },
        now: first + 365 * DAY,
      }),
    ).toEqual({ kind: 'skip', reason: 'shown_this_version' });
  });

  it('waits 120 days after the last prompt even on a new version', () => {
    const history = { ...eligible, lastRatingPrompt: { version: '2.0.0', at: first + 3 * DAY } };
    expect(decide({ history, appVersion: '2.1.0', now: first + 100 * DAY })).toEqual({
      kind: 'skip',
      reason: 'shown_recently',
    });
    expect(decide({ history, appVersion: '2.1.0', now: first + 123 * DAY })).toEqual({
      kind: 'show',
    });
  });
});

describe('favoritesTrigger', () => {
  it('fires from the fifth favorite on', () => {
    expect(favoritesTrigger(4)).toBeNull();
    expect(favoritesTrigger(5)).toBe('favorites_milestone');
    expect(favoritesTrigger(12)).toBe('favorites_milestone');
  });
});

describe('menuHasFavorite', () => {
  it('matches a favorite by name', () => {
    expect(menuHasFavorite(['Pizza', 'Tacos'], ['Tacos'])).toBe(true);
  });

  it('is false with no favorites or no match', () => {
    expect(menuHasFavorite(['Pizza'], [])).toBe(false);
    expect(menuHasFavorite(['Pizza', null], ['Tacos'])).toBe(false);
  });
});
