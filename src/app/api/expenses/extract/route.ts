import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const EXTRACT_TIMEOUT_MS = 30_000;

const CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Home",
  "Other",
] as const;

interface ExtractedExpense {
  amount: number | null;
  currency: string | null;
  date: string | null;
  description: string | null;
  category: string | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI extraction not configured" },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "AI extraction only supports images" },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)` },
      { status: 413 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const mediaType = file.type as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `Extract expense details from this receipt image. Return ONLY valid JSON with these fields:

{
  "amount": <number or null>,
  "currency": "<3-letter currency code or null>",
  "date": "<YYYY-MM-DD or null>",
  "description": "<merchant name and/or brief description of purchase, or null>",
  "category": "<one of: ${CATEGORIES.join(", ")}>"
}

Rules:
- amount should be the total/final amount paid
- currency should be a 3-letter ISO code (EUR, USD, GBP, etc.)
- date should be the receipt date in YYYY-MM-DD format
- description should be concise: merchant name + what was purchased
- category must be exactly one of the listed values
- Use null for any field you cannot determine
- Return ONLY the JSON object, no markdown fences or extra text`,
              },
            ],
          },
        ],
      },
      { timeout: EXTRACT_TIMEOUT_MS }
    );

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response, stripping any markdown fences
    const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
    const extracted: ExtractedExpense = JSON.parse(cleaned);

    // Validate category
    if (
      extracted.category &&
      !CATEGORIES.includes(extracted.category as (typeof CATEGORIES)[number])
    ) {
      extracted.category = "Other";
    }

    return NextResponse.json({ extracted });
  } catch (err) {
    console.error("AI extraction error:", err);
    return NextResponse.json(
      { error: "AI extraction failed", detail: String(err) },
      { status: 500 }
    );
  }
}
