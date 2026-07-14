import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { Page } from "./api/catalog";
import {
  NOTIFICATIONS_KEY,
  NOTIFICATIONS_UNREAD_KEY,
  fetchNotifications,
  fetchUnreadCount,
} from "./api/notifications";
import type { ApiNotification } from "./api/types";

function nextPage(last: Page<ApiNotification>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

/**
 * The inbox query. The screen paginates on scroll (`onEndReached`) like every
 * other list - it no longer eagerly drains all pages, since the badge count now
 * comes from the dedicated endpoint below.
 */
export function useNotifications() {
  const query = useInfiniteQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return { query, items };
}

/**
 * The header bell badge count. One small request against the unread-count
 * endpoint instead of paging the whole history. Shares the `["notifications"]`
 * key prefix, so marking read / a push arriving (both invalidate that prefix)
 * refreshes the badge.
 */
export function useUnreadCount() {
  const query = useQuery({
    queryKey: NOTIFICATIONS_UNREAD_KEY,
    queryFn: fetchUnreadCount,
  });
  return query.data ?? 0;
}
