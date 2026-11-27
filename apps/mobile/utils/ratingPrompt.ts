export const RATING_MIN_LAUNCHES = 3;
export const RATING_MIN_DAYS = 3;
export const RATING_MIN_DAYS_BETWEEN_PROMPTS = 120;
export const RATING_FAVORITES_MILESTONE = 5;
export const RATING_ENGAGED_LAUNCHES = 10;
export const RATING_ENGAGED_DAYS = 7;
export const RATING_PROMPT_DELAY_MS = 1500;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RatingTrigger = 'favorites_milestone' | 'favorite_on_menu' | 'engaged_menu_view';

export type RatingPromptRecord = { version: string; at: number };

export type RatingPromptHistory = {
  launchCount: number;
  firstLaunchTimestamp: number | null;
  lastRatingPrompt: RatingPromptRecord | null;
};

export type RatingPromptSkipReason =
  | 'onboarding'
  | 'offline'
  | 'too_new'
  | 'shown_this_version'
  | 'shown_recently';

export type RatingPromptDecision =
  | { kind: 'show' }
  | { kind: 'skip'; reason: RatingPromptSkipReason };

export const decideRatingPrompt = (input: {
  history: RatingPromptHistory;
  appVersion: string;
  isOnboardingComplete: boolean;
  isOnline: boolean;
  now: number;
}): RatingPromptDecision => {
  const { history, appVersion, now } = input;
  if (!input.isOnboardingComplete) return { kind: 'skip', reason: 'onboarding' };
  if (history.firstLaunchTimestamp === null || history.launchCount < RATING_MIN_LAUNCHES) {
    return { kind: 'skip', reason: 'too_new' };
  }
  if (now - history.firstLaunchTimestamp < RATING_MIN_DAYS * DAY_MS) {
    return { kind: 'skip', reason: 'too_new' };
  }
  const last = history.lastRatingPrompt;
  if (last?.version === appVersion) return { kind: 'skip', reason: 'shown_this_version' };
  if (last && now - last.at < RATING_MIN_DAYS_BETWEEN_PROMPTS * DAY_MS) {
    return { kind: 'skip', reason: 'shown_recently' };
  }
  if (!input.isOnline) return { kind: 'skip', reason: 'offline' };
  return { kind: 'show' };
};

export const favoritesTrigger = (favoriteCount: number): RatingTrigger | null =>
  favoriteCount >= RATING_FAVORITES_MILESTONE ? 'favorites_milestone' : null;

const menuHasFavorite = (foodNames: (string | null)[], favoriteNames: string[]) => {
  if (favoriteNames.length === 0) return false;
  const favorites = new Set(favoriteNames);
  return foodNames.some((name) => name !== null && favorites.has(name));
};

const isEngaged = (history: RatingPromptHistory, now: number) =>
  history.firstLaunchTimestamp !== null &&
  history.launchCount >= RATING_ENGAGED_LAUNCHES &&
  now - history.firstLaunchTimestamp >= RATING_ENGAGED_DAYS * DAY_MS;

export const menuViewTrigger = (input: {
  foodNames: (string | null)[];
  favoriteNames: string[];
  history: RatingPromptHistory;
  now: number;
}): RatingTrigger | null => {
  if (input.foodNames.length === 0) return null;
  if (menuHasFavorite(input.foodNames, input.favoriteNames)) return 'favorite_on_menu';
  if (isEngaged(input.history, input.now)) return 'engaged_menu_view';
  return null;
};
