import type { InfiniteData } from "@tanstack/react-query";

import type { Page } from "./api/catalog";

/**
 * Shared helpers for our paginated `Page<T>` shape over TanStack infinite
 * queries. These were copy-pasted per screen (MB7 2.1/2.6); keep them here so
 * "what's the next page" and "how to edit cached items" are defined once.
 */

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
