import { describe, it, expect } from "vitest";
import { buildMealGroceryPrompt, fallbackMealToGroceryItems } from "@/features/meals/grocery";
import type { MealPlan } from "@/features/meals/queries";

function makeMeal(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    id: overrides.id ?? "meal-1",
    week_start: overrides.week_start ?? "2026-04-14",
    day_of_week: overrides.day_of_week ?? 2,
    meal_type: overrides.meal_type ?? "dinner",
    title: overrides.title ?? "Pasta night",
    notes: overrides.notes ?? null,
    recipe_url: overrides.recipe_url ?? null,
    created_by: overrides.created_by ?? "user-1",
    created_at: overrides.created_at ?? "2026-04-14T07:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-04-14T07:00:00.000Z",
  };
}

describe("meal to grocery helpers", () => {
  it("builds a useful grocery parsing prompt from meal title, notes, and recipe URL", () => {
    const meal = makeMeal({
      title: "Chicken tacos",
      notes: "Need tortillas, avocado, limes",
      recipe_url: "https://example.com/tacos",
    });

    const prompt = buildMealGroceryPrompt(meal);

    expect(prompt).toContain("Chicken tacos");
    expect(prompt).toContain("Need tortillas, avocado, limes");
    expect(prompt).toContain("https://example.com/tacos");
  });

  it("falls back to ingredient-like items parsed from notes", () => {
    const meal = makeMeal({
      notes: "tomatoes, basil, mozzarella",
    });

    const items = fallbackMealToGroceryItems(meal);

    expect(items.map((item) => item.name)).toEqual([
      "tomatoes",
      "basil",
      "mozzarella",
    ]);
    expect(items.every((item) => item.category === "Other")).toBe(true);
  });

  it("falls back to the meal title when no notes exist", () => {
    const meal = makeMeal({ title: "BBQ chicken bowls" });

    const items = fallbackMealToGroceryItems(meal);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("BBQ chicken bowls");
  });
});
