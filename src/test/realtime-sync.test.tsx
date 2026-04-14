import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const invalidateQueries = vi.fn();
const removeChannel = vi.fn();
let realtimeCallback: ((payload: { eventType: string; old: Record<string, unknown>; new: Record<string, unknown> }) => void) | undefined;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: (_event: string, _filter: unknown, callback: typeof realtimeCallback) => {
        realtimeCallback = callback;
        return {
          subscribe: () => ({ id: "test-channel" }),
        };
      },
    }),
    removeChannel,
  }),
}));

vi.mock("@/features/auth/store", () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: "user-1" } }),
}));

import { useRealtimeSync } from "@/hooks/use-realtime-sync";

describe("useRealtimeSync", () => {
  beforeEach(() => {
    invalidateQueries.mockReset();
    removeChannel.mockReset();
    realtimeCallback = undefined;
  });

  it("invalidates the exact query key passed in", () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation(invalidateQueries);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useRealtimeSync({
          table: "todos",
          queryKey: ["todos", "user-1"],
          channelName: "todos-realtime",
          userIdColumn: "created_by",
        }),
      { wrapper }
    );

    expect(realtimeCallback).toBeTypeOf("function");

    realtimeCallback?.({
      eventType: "INSERT",
      old: {},
      new: { id: "todo-1", created_by: "user-2" },
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["todos", "user-1"],
    });
  });

  it("ignores changes made by the current user", () => {
    const queryClient = new QueryClient();
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation(invalidateQueries);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useRealtimeSync({
          table: "todos",
          queryKey: ["todos", "user-1"],
          channelName: "todos-realtime",
          userIdColumn: "created_by",
        }),
      { wrapper }
    );

    realtimeCallback?.({
      eventType: "UPDATE",
      old: {},
      new: { id: "todo-1", created_by: "user-1" },
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
