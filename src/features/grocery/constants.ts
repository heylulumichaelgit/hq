export const GROCERY_CATEGORIES = [
  "Produce",
  "Meat & Fish",
  "Dairy",
  "Bakery",
  "Frozen",
  "Pantry",
  "Drinks",
  "Household",
  "Other",
] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];
