// Local-storage helpers for saving generated meal plans in the browser.

import { useState, useEffect, useCallback } from "react";

type MealType = "breakfast" | "lunch" | "dinner";

export type SavedMealPlanEntry = {
  day: number;
  mealType: MealType;
  recipeId: string | null;
  recipeTitle: string;
  sideIds?: string[];
  sideTitles?: string[];
  sauceIds?: string[];
  sauceTitles?: string[];
};

export type SavedMealPlan = {
  id: string;
  name: string;
  days: number;
  mealTypes: MealType[];
  dietaryFilters: string[];
  entries: SavedMealPlanEntry[];
  createdAt: string;
};

const STORAGE_KEY = "cookbook-saved-meal-plans";

function readFromStorage(): SavedMealPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage(plans: SavedMealPlan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function useSavedMealPlans() {
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>(readFromStorage);

  useEffect(() => {
    writeToStorage(savedPlans);
  }, [savedPlans]);

  const savePlan = useCallback((plan: Omit<SavedMealPlan, "id" | "createdAt">) => {
    const newPlan: SavedMealPlan = {
      ...plan,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSavedPlans((prev) => [newPlan, ...prev]);
    return newPlan;
  }, []);

  const deletePlan = useCallback((id: string) => {
    setSavedPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const renamePlan = useCallback((id: string, name: string) => {
    setSavedPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }, []);

  return { savedPlans, savePlan, deletePlan, renamePlan };
}
