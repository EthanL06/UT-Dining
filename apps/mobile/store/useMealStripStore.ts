import { create } from 'zustand';

import { miscStorage } from './misc-storage';

const LAST_OPENED_LOCATION_KEY = 'meal-strip-last-opened-location';
const DISMISSED_MEAL_KEY = 'meal-strip-dismissed-meal';

interface MealStripState {
  lastOpenedLocation: string | null;
  dismissedMeal: string | null;
  setLastOpenedLocation: (name: string) => void;
  dismissMeal: (mealKey: string) => void;
}

export const useMealStripStore = create<MealStripState>((set) => ({
  lastOpenedLocation: miscStorage.getString(LAST_OPENED_LOCATION_KEY) ?? null,
  dismissedMeal: miscStorage.getString(DISMISSED_MEAL_KEY) ?? null,

  setLastOpenedLocation: (name) => {
    miscStorage.set(LAST_OPENED_LOCATION_KEY, name);
    set({ lastOpenedLocation: name });
  },

  dismissMeal: (mealKey) => {
    miscStorage.set(DISMISSED_MEAL_KEY, mealKey);
    set({ dismissedMeal: mealKey });
  },
}));
