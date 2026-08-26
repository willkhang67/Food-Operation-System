"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isApiError } from "@/lib/api";

/**
 * In-memory only — never persist to localStorage. Private order/account JSON
 * must not survive a full reload on a shared device via disk.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Per-query staleTime overrides this. Default 0 means "revalidate when
        // used", which is the safe default for private data.
        staleTime: 0,
        // Drop unused entries after 5 minutes so a long-lived tab does not keep
        // another user's orders forever after logout (clear() still runs on
        // logout; this is defence in depth).
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          // Auth failures are answers, not blips — retrying them burns rate
          // limits and can flash the wrong UI.
          if (
            isApiError(error) &&
            (error.status === 401 || error.status === 403 || error.status === 404)
          ) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // One client per browser session. Creating inside useState avoids sharing a
  // module-level client across SSR requests if this ever runs on the server.
  const [client] = useState(createQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
