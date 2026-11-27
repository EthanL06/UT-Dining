export const RATING_MIN_LAUNCHES = 3;
export const RATING_MIN_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export const isRatingPromptDue = (
  launches: {
    launchCount: number;
    firstLaunchTimestamp: number | null;
    hasShownRatingPrompt: boolean;
  },
  now: number,
) => {
  if (launches.hasShownRatingPrompt || launches.firstLaunchTimestamp === null) return false;
  if (launches.launchCount < RATING_MIN_LAUNCHES) return false;
  return now - launches.firstLaunchTimestamp >= RATING_MIN_DAYS * DAY_MS;
};
