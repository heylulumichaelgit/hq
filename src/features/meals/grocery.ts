import type { GroceryCategory } from "@/features/grocery/constants";
import type { MealPlan } from "./queries";

export interface MealToGroceryItemDraft {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
}

interface ParseResult {
  items: MealToGroceryItemDraft[];
  suggestions?: string[];
}

function splitCandidateIngredients(text: string) {
  return text
    .split(/\n|,|•|·|\band\b/gi)
    .map((part) => part.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function buildMealGroceryPrompt(meal: MealPlan) {
  const parts = [meal.title.trim()];
  if (meal.notes?.trim()) {
    parts.push(`Notes: ${meal.notes.trim()}`);
  }
  if (meal.recipe_url?.trim()) {
    parts.push(`Recipe: ${meal.recipe_url.trim()}`);
  }
  return `Create a grocery list for this planned meal: ${parts.join(". ")}`;
}

export function fallbackMealToGroceryItems(meal: MealPlan): MealToGroceryItemDraft[] {
  const source = meal.notes?.trim() || meal.title;
  return splitCandidateIngredients(source).map((name) => ({
    name,
    quantity: null,
    unit: null,
    category: "Other",
  }));
}

export async function parseMealToGroceryItems(meal: MealPlan): Promise<MealToGroceryItemDraft[]> {
  const response = await fetch("/api/grocery/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: buildMealGroceryPrompt(meal) }),
  });

  if (!response.ok) {
    return fallbackMealToGroceryItems(meal);
  }

  const result = (await response.json()) as ParseResult;
  const items = result.items ?? [];

  if (items.length === 0) {
    return fallbackMealToGroceryItems(meal);
  }

  return items;
}
