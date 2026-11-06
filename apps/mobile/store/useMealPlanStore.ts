import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDateFromString, formatDateForDisplay, getTodayInCentralTime } from '~/utils/date';
import { zustandStorage } from './rnmmkv-storage';

const STORAGE_KEY_MEALPLAN = 'mealPlanItems';
const STORE_VERSION = 1;

export interface MealPlanFoodRef {
  name: string;
  locationName: string;
  menuName: string;
  categoryName: string;
}

export interface MealPlanItem extends MealPlanFoodRef {
  id: string;
  quantity: number;
  addedAt: number;
  nutrition: {
    calories: string;
    protein: string;
    total_carbohydrates: string;
    total_fat?: string;
  } | null;
  allergens: Record<string, boolean>;
}

export type MealPlanItemInput = Omit<MealPlanItem, 'id' | 'quantity' | 'addedAt'>;

interface MealPlanState {
  plans: Record<string, MealPlanItem[]>;

  toggleMealPlanItem: (item: MealPlanItemInput, date?: string) => boolean;
  removeMealPlanItem: (id: string, date?: string) => void;
  updateMealPlanItemQuantity: (id: string, quantity: number, date?: string) => void;
  clearMealPlan: (date?: string) => void;
}

const EMPTY_PLAN: MealPlanItem[] = [];

export const mealPlanItemId = (ref: MealPlanFoodRef) =>
  [ref.locationName, ref.menuName, ref.categoryName, ref.name].join('\u001f');

export const todayKey = () => getTodayInCentralTime();

const withPlan = (
  plans: Record<string, MealPlanItem[]>,
  date: string,
  items: MealPlanItem[],
): Record<string, MealPlanItem[]> => {
  const next = { ...plans };
  if (items.length === 0) {
    delete next[date];
  } else {
    next[date] = items;
  }
  return next;
};

interface LegacyMealPlanItem {
  name: string;
  locationName?: string;
  menuName?: string;
  categoryName?: string;
  quantity?: number;
  nutrition?: MealPlanItem['nutrition'];
  allergens?: Record<string, boolean>;
}

export const migrateLegacyItems = (
  legacy: LegacyMealPlanItem[],
  date: string,
): Record<string, MealPlanItem[]> => {
  const seen = new Set<string>();
  const items: MealPlanItem[] = [];
  for (const old of legacy) {
    if (!old?.name) continue;
    const ref: MealPlanFoodRef = {
      name: old.name,
      locationName: old.locationName ?? '',
      menuName: old.menuName ?? '',
      categoryName: old.categoryName ?? '',
    };
    const id = mealPlanItemId(ref);
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      ...ref,
      id,
      quantity: old.quantity || 1,
      addedAt: 0,
      nutrition: old.nutrition ?? null,
      allergens: old.allergens ?? {},
    });
  }
  return items.length > 0 ? { [date]: items } : {};
};

export const useMealPlanStore = create<MealPlanState>()(
  persist(
    (set, get) => ({
      plans: {},

      toggleMealPlanItem: (input, date = todayKey()) => {
        const id = mealPlanItemId(input);
        const current = get().plans[date] ?? EMPTY_PLAN;
        const exists = current.some((item) => item.id === id);
        const items = exists
          ? current.filter((item) => item.id !== id)
          : [...current, { ...input, id, quantity: 1, addedAt: Date.now() }];
        set((state) => ({ plans: withPlan(state.plans, date, items) }));
        return !exists;
      },

      removeMealPlanItem: (id, date = todayKey()) => {
        set((state) => ({
          plans: withPlan(
            state.plans,
            date,
            (state.plans[date] ?? EMPTY_PLAN).filter((item) => item.id !== id),
          ),
        }));
      },

      updateMealPlanItemQuantity: (id, quantity, date = todayKey()) => {
        set((state) => ({
          plans: withPlan(
            state.plans,
            date,
            (state.plans[date] ?? EMPTY_PLAN).map((item) =>
              item.id === id ? { ...item, quantity } : item,
            ),
          ),
        }));
      },

      clearMealPlan: (date = todayKey()) => {
        set((state) => ({ plans: withPlan(state.plans, date, EMPTY_PLAN) }));
      },
    }),
    {
      name: STORAGE_KEY_MEALPLAN,
      version: STORE_VERSION,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ plans: state.plans }),
      migrate: (persisted, version) => {
        if (version === 0) {
          const legacy = (persisted as { mealPlanItems?: LegacyMealPlanItem[] })?.mealPlanItems;
          return { plans: migrateLegacyItems(legacy ?? [], todayKey()) };
        }
        return persisted as { plans: Record<string, MealPlanItem[]> };
      },
    },
  ),
);

export const useMealPlanItems = (date: string) =>
  useMealPlanStore((state) => state.plans[date] ?? EMPTY_PLAN);

export const useIsMealPlanItem = (ref: MealPlanFoodRef, date: string) => {
  const id = mealPlanItemId(ref);
  return useMealPlanStore((state) => (state.plans[date] ?? EMPTY_PLAN).some((i) => i.id === id));
};

export const useMealPlanDates = () => {
  const plans = useMealPlanStore((state) => state.plans);
  return Object.keys(plans).sort();
};

export const sumNutrient = (
  items: MealPlanItem[],
  key: keyof NonNullable<MealPlanItem['nutrition']>,
) =>
  items.reduce(
    (sum, item) =>
      sum + (parseFloat(String(item.nutrition?.[key] || 0)) || 0) * (item.quantity || 1),
    0,
  );

export const planDayPhrase = (date: string) => {
  const label = formatDateForDisplay(createDateFromString(date));
  if (date === todayKey()) return 'today';
  return ['Yesterday', 'Tomorrow', 'Today'].includes(label) ? label.toLowerCase() : label;
};
