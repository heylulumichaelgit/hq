import { describe, it, expect } from "vitest";
import type { GroceryStaple } from "@/lib/supabase/types";

function buildStapleInsertPayload(staples: GroceryStaple[], addedBy?: string | null) {
  const basePosition = 1_700_000_000;
  return staples.map((staple, index) => ({
    name: staple.name,
    category: staple.category,
    quantity: staple.quantity,
    unit: staple.unit,
    notes: staple.notes,
    is_checked: false,
    added_by: addedBy ?? staple.added_by ?? null,
    position: basePosition + index,
  }));
}

function makeStaple(overrides: Partial<GroceryStaple> = {}): GroceryStaple {
  return {
    id: overrides.id ?? "staple-1",
    name: overrides.name ?? "Milk",
    category: overrides.category ?? "Dairy",
    quantity: overrides.quantity ?? 2,
    unit: overrides.unit ?? "bottles",
    notes: overrides.notes ?? null,
    added_by: overrides.added_by ?? "user-1",
    created_at: overrides.created_at ?? "2026-04-14T08:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-04-14T08:00:00.000Z",
  };
}

describe("grocery staples helpers", () => {
  it("converts staples into unchecked grocery inserts", () => {
    const payload = buildStapleInsertPayload([
      makeStaple({ name: "Milk" }),
      makeStaple({ id: "staple-2", name: "Eggs", category: "Dairy", quantity: 12, unit: null }),
    ]);

    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      name: "Milk",
      category: "Dairy",
      is_checked: false,
    });
    expect(payload[1].position).toBe(payload[0].position + 1);
  });

  it("prefers the explicit addedBy override when repopulating staples", () => {
    const payload = buildStapleInsertPayload([
      makeStaple({ name: "Bread", added_by: "user-1" }),
    ], "user-2");

    expect(payload[0].added_by).toBe("user-2");
  });
});
