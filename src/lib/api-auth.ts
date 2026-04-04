import { NextRequest } from "next/server";
import crypto from "crypto";

/** Timing-safe comparison of two strings. */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to avoid leaking length info via short-circuit timing
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
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

/** Allowed Google accounts for API access. Add emails here to grant access. */
const ALLOWED_GMAIL_ACCOUNTS = new Set(
  (process.env.HQ_ALLOWED_GMAIL_ACCOUNTS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
);

/** Check if a Google email is allowed for API access.
 *  Returns true if the allowlist is empty (backwards compat) or the email is in it. */
export function isAllowedGmailAccount(email: string): boolean {
  if (ALLOWED_GMAIL_ACCOUNTS.size === 0) return true;
  return ALLOWED_GMAIL_ACCOUNTS.has(email.toLowerCase());
}
