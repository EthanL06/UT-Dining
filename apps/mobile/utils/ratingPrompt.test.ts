import { describe, expect, it } from 'vitest';
import { isRatingPromptDue } from './ratingPrompt';

const DAY = 24 * 60 * 60 * 1000;
const first = Date.UTC(2026, 10, 20);

describe('isRatingPromptDue', () => {
  it('waits on the second launch right after onboarding', () => {
    expect(
      isRatingPromptDue(
        { launchCount: 2, firstLaunchTimestamp: first, hasShownRatingPrompt: false },
        first + 60_000,
      ),
    ).toBe(false);
  });

  it('waits for three days even after many launches', () => {
    expect(
      isRatingPromptDue(
        { launchCount: 9, firstLaunchTimestamp: first, hasShownRatingPrompt: false },
        first + 2 * DAY,
      ),
    ).toBe(false);
  });

  it('waits for a third launch after three days', () => {
    expect(
      isRatingPromptDue(
        { launchCount: 2, firstLaunchTimestamp: first, hasShownRatingPrompt: false },
        first + 5 * DAY,
      ),
    ).toBe(false);
  });

  it('is due on the third launch three days in', () => {
    expect(
      isRatingPromptDue(
        { launchCount: 3, firstLaunchTimestamp: first, hasShownRatingPrompt: false },
        first + 3 * DAY,
      ),
    ).toBe(true);
  });

  it('never shows twice', () => {
    expect(
      isRatingPromptDue(
        { launchCount: 20, firstLaunchTimestamp: first, hasShownRatingPrompt: true },
        first + 30 * DAY,
      ),
    ).toBe(false);
  });

  it('needs a first launch time', () => {
    expect(
      isRatingPromptDue(
        { launchCount: 5, firstLaunchTimestamp: null, hasShownRatingPrompt: false },
        first,
      ),
    ).toBe(false);
  });
});
