import type { InfiniteData } from "@tanstack/react-query";

import type { Page } from "./api/catalog";

/**
 * Shared helpers for our paginated `Page<T>` shape over TanStack infinite
 * queries. These were copy-pasted per screen (MB7 2.1/2.6); keep them here so
 * "what's the next page" and "how to edit cached items" are defined once.
 */

/**
 * How many rows every long list requests per page. Fixed, not a user setting:
 * pages scroll in automatically as you reach the end, so the number is never
 * something a user sees or benefits from tuning. 50 also keeps each request
 * light enough to stay well under the API's rate limits.
 */
export const PAGE_SIZE = 50;

/** `getNextPageParam` for a `useInfiniteQuery` over `Page<T>`. */
export function nextPage<T>(last: Page<T>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

/** Apply `fn` to the items of every cached page (for optimistic cache edits). */
export function mapPageItems<T>(
  data: InfiniteData<Page<T>> | undefined,
  fn: (items: T[]) => T[],
): InfiniteData<Page<T>> | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p) => ({ ...p, items: fn(p.items) })) };
}
