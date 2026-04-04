import { NextRequest } from "next/server";
import crypto from "crypto";

/** Timing-safe comparison via HMAC — constant time regardless of input length.
 *  Both values are hashed to the same fixed length before comparison,
 *  preventing length-oracle attacks. */
function timingSafeCompare(a: string, b: string): boolean {
  const key = crypto.randomBytes(32);
  const hmacA = crypto.createHmac("sha256", key).update(a).digest();
  const hmacB = crypto.createHmac("sha256", key).update(b).digest();
  return crypto.timingSafeEqual(hmacA, hmacB);
}

/** Validate a Bearer token against HQ_API_KEY. */
export function validateApiKey(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (!header) return false;

  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;

  const apiKey = process.env.HQ_API_KEY;
  if (!apiKey) return false;

  return timingSafeCompare(token, apiKey);
}

/** Allowed Google accounts for API access. Add emails here to grant access.
 *  FAIL-CLOSED: if the env var is missing or empty, NO accounts are allowed. */
const ALLOWED_GMAIL_ACCOUNTS = new Set(
  (process.env.HQ_ALLOWED_GMAIL_ACCOUNTS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
);

/** Check if a Google email is allowed for API access.
 *  Returns false if the allowlist is empty (fail-closed). */
export function isAllowedGmailAccount(email: string): boolean {
  if (ALLOWED_GMAIL_ACCOUNTS.size === 0) return false;
  return ALLOWED_GMAIL_ACCOUNTS.has(email.toLowerCase());
}
