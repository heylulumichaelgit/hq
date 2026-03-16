import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import Instructor from "@instructor-ai/instructor";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { GROCERY_CATEGORIES } from "@/features/grocery/constants";

const GroceryItemSchema = z.object({
  name: z.string().describe("Clean item name, e.g. 'olive oil', 'free-range eggs', 'sourdough bread'"),
  quantity: z.number().nullable().describe("Numeric quantity, null if unspecified or vague"),
  unit: z.string().nullable().describe("Unit like 'kg', 'g', 'bottles', 'cans', 'litres', null if unspecified"),
  category: z.enum(GROCERY_CATEGORIES).describe("The most appropriate grocery category for this item"),
});

const ParseResultSchema = z.object({
  items: z.array(GroceryItemSchema),
  suggestions: z
    .array(z.string())
    .max(4)
    .describe(
      "Up to 4 items the family might have forgotten based on what they're buying (e.g. if they have pasta, suggest sauce). Only suggest if genuinely useful."
    ),
});

export type ParsedGroceryItem = z.infer<typeof GroceryItemSchema>;
export type ParseResult = z.infer<typeof ParseResultSchema>;

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { input } = await req.json();
  if (!input?.trim()) {
    return NextResponse.json({ error: "No input provided" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const client = Instructor({ client: anthropic, mode: "TOOLS" });

    const result = await client.chat.completions.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Parse the following grocery list input into structured items. The input may be typed text or a voice transcript.

<input>${input}</input>

Rules:
- Split multi-item inputs into individual items
- Normalise item names (e.g. "chocs" → "chocolate", "toms" → "tomatoes")
- Infer quantities and units where mentioned (e.g. "2 bottles of water" → quantity: 2, unit: "bottles")
- Choose the most accurate category from the allowed list
- For suggestions, only add items that clearly complement what's being bought`,
        },
      ],
      response_model: { schema: ParseResultSchema, name: "ParseResult" },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Grocery parse error:", err);
    // Graceful fallback — return raw input as a single uncategorised item
    return NextResponse.json({
      items: [{ name: input.trim(), quantity: null, unit: null, category: "Other" }],
      suggestions: [],
    });
  }
}
