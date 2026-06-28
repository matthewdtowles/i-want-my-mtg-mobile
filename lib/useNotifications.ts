import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import type { Page } from "./api/catalog";
import { NOTIFICATIONS_KEY, fetchNotifications } from "./api/notifications";
import type { ApiNotification } from "./api/types";

function nextPage(last: Page<ApiNotification>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

/**
 * Shared notifications query for both the inbox screen and the header bell
 * badge - one cache (`["notifications"]`) so the unread count stays in sync.
 * Auto-pages the whole list (like inventory) so the badge count is exact.
 */
export function useNotifications() {
  const query = useInfiniteQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query.hasNextPage, query.isFetchingNextPage, query]);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const unread = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  return { query, items, unread };
}
