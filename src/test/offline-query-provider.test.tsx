import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/providers/query-provider";

const persistSpy = vi.fn();

vi.mock("@tanstack/react-query-persist-client", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    PersistQueryClientProvider: ({ client, children, persistOptions }: { client: QueryClient; children: React.ReactNode; persistOptions: unknown }) => {
      persistSpy({ client, persistOptions });
      return actual.QueryClientProvider({ client, children });
    },
  };
});

function QueryClientProbe() {
  const queryClient = useQueryClient();
  const defaults = queryClient.getDefaultOptions();

  return (
    <div
      data-testid="probe"
      data-retry={String(defaults.queries?.retry)}
      data-network-mode={String(defaults.queries?.networkMode)}
      data-mutation-network-mode={String(defaults.mutations?.networkMode)}
    />
  );
}

describe("QueryProvider offline persistence", () => {
  beforeEach(() => {
    persistSpy.mockClear();
  });

  it("configures React Query for offline-first operation", async () => {
    const { getByTestId } = render(
      <QueryProvider>
        <QueryClientProbe />
      </QueryProvider>
    );

    const probe = getByTestId("probe");
    expect(probe.dataset.retry).toBe("1");
    expect(probe.dataset.networkMode).toBe("offlineFirst");
    expect(probe.dataset.mutationNetworkMode).toBe("offlineFirst");
  });

  it("persists only selected HQ query families", async () => {
    render(
      <QueryProvider>
        <QueryClientProbe />
      </QueryProvider>
    );

    await waitFor(() => expect(persistSpy).toHaveBeenCalled());
    const call = persistSpy.mock.calls[0][0] as {
      persistOptions: {
        dehydrateOptions: { shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => boolean };
      };
    };

    const shouldDehydrate = call.persistOptions.dehydrateOptions.shouldDehydrateQuery;

    expect(shouldDehydrate({ queryKey: ["todos", "user-1"] })).toBe(true);
    expect(shouldDehydrate({ queryKey: ["grocery_items"] })).toBe(true);
    expect(shouldDehydrate({ queryKey: ["profiles"] })).toBe(true);
    expect(shouldDehydrate({ queryKey: ["calendar-events"] })).toBe(false);
  });
});
