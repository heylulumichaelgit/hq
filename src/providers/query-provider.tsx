"use client";

import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useState, type ReactNode } from "react";
import { offlineStore } from "@/lib/offline-store";

const PERSISTED_QUERY_PREFIXES = ["todos", "grocery_items", "profiles"] as const;

function shouldPersistQuery(queryKey: QueryKey) {
  const root = queryKey[0];
  return typeof root === "string" && PERSISTED_QUERY_PREFIXES.includes(root as (typeof PERSISTED_QUERY_PREFIXES)[number]);
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 1000 * 60 * 60 * 24,
        // Refetch when the PWA resumes from background so stale data refreshes.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
      },
    },
  });
}

const persister = createAsyncStoragePersister({
  storage: offlineStore,
  key: "hq-react-query-cache",
  throttleTime: 1000,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => shouldPersistQuery(query.queryKey),
        },
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PersistQueryClientProvider>
  );
}
