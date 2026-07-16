import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo } from "react";

import type { Page } from "../api/catalog";
import {
  NOTIFICATIONS_KEY,
  NOTIFICATIONS_UNREAD_KEY,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import type { ApiNotification } from "../api/types";
import { mapPageItems, nextPage } from "../pagination";
import { useOptimisticMutation } from "../useOptimisticMutation";

type NotificationData = InfiniteData<Page<ApiNotification>>;

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

/**
 * Mark one notification read, optimistically. The inbox keeps its optimistic
 * value (no reason to refetch the whole history for a read flag); only the
 * badge count re-syncs on settle.
 */
export function useMarkNotificationRead() {
  return useOptimisticMutation<NotificationData, number>({
    queryKey: NOTIFICATIONS_KEY,
    mutationFn: (id) => markNotificationRead(id),
    apply: (old, id) =>
      mapPageItems(old, (list) =>
        list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      ),
    errorTitle: "Couldn't mark as read",
    invalidates: [NOTIFICATIONS_UNREAD_KEY],
  });
}

export function useMarkAllNotificationsRead() {
  return useOptimisticMutation<NotificationData, void>({
    queryKey: NOTIFICATIONS_KEY,
    mutationFn: () => markAllNotificationsRead(),
    apply: (old) =>
      mapPageItems(old, (list) => list.map((n) => ({ ...n, isRead: true }))),
    errorTitle: "Couldn't mark all as read",
    // The whole prefix, so both the inbox and the badge count re-sync.
    invalidates: [NOTIFICATIONS_KEY],
  });
}
