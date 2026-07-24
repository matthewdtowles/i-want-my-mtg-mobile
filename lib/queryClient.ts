import { QueryClient } from "@tanstack/react-query";

// Single app-wide query client. The catalog (sets, cards, prices) barely
// changes within a session, so we cache aggressively to stay under the API's
// rate limits: a long staleTime means revisiting a screen serves from cache
// instead of refetching, and a long gcTime keeps that cache around across
// navigation. Data that does change (inventory, portfolio) is refreshed by
// explicit invalidation on mutation, which ignores staleTime — so these
// defaults are safe to raise.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000, // 5 min
      gcTime: 60 * 60_000, // 1 hour
    },
  },
});
