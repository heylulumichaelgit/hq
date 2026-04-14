import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock web-push before importing the route ────────────────────────────────
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

// ─── Mock Supabase server client ─────────────────────────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === "todos") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      if (table === "family_events") {
        return {
          select: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      if (table === "push_subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }

      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  }),
}));

// ─── Helper: build a NextRequest ─────────────────────────────────────────────
const makeReq = (auth?: string) =>
  new NextRequest("http://localhost/api/cron/daily-reminder", {
    headers: auth ? { authorization: auth } : {},
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/daily-reminder — authentication checks", () => {
  beforeEach(() => {
    // Reset environment before every test
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_EMAIL;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns 500 when CRON_SECRET env var is not set", async () => {
    // CRON_SECRET is not set (deleted in beforeEach)
    const { GET } = await import("@/app/api/cron/daily-reminder/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("CRON_SECRET");
  });

  it("returns 401 when Authorization header is missing", async () => {
    process.env.CRON_SECRET = "secret123";
    const { GET } = await import("@/app/api/cron/daily-reminder/route");
    const res = await GET(makeReq()); // no auth header
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("returns 401 when Authorization header has wrong value", async () => {
    process.env.CRON_SECRET = "secret123";
    const { GET } = await import("@/app/api/cron/daily-reminder/route");
    const res = await GET(makeReq("Bearer wrongsecret"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("returns 500 when VAPID keys are missing but auth is correct", async () => {
    process.env.CRON_SECRET = "secret123";
    // VAPID keys are NOT set
    const { GET } = await import("@/app/api/cron/daily-reminder/route");
    const res = await GET(makeReq("Bearer secret123"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("VAPID");
  });

  it("returns 200 with { ok: true } when auth is correct, VAPID is set, and no todos exist", async () => {
    process.env.CRON_SECRET = "secret123";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "fake-public-key";
    process.env.VAPID_PRIVATE_KEY = "fake-private-key";

    const { GET } = await import("@/app/api/cron/daily-reminder/route");
    const res = await GET(makeReq("Bearer secret123"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.todoCount).toBe(0);
    expect(body.eventCount).toBe(0);
  });
});
