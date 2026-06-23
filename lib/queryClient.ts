import { QueryClient } from "@tanstack/react-query";

// Single app-wide query client. Tuning (retries, staleTime per query)
// lands with the real data screens; sensible defaults for now.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
