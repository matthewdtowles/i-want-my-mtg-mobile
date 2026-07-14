import { api } from "./client";
import type { Page } from "./catalog";
import { errMessage } from "./envelope";
import type { ApiNotification } from "./types";

export const NOTIFICATIONS_KEY = ["notifications"] as const;
// Under the notifications family so push-arrival invalidation of
// `["notifications"]` refreshes the badge too.
export const NOTIFICATIONS_UNREAD_KEY = ["notifications", "unread-count"] as const;

/**
 * The unread-notification count for the header badge - one tiny request, vs.
 * draining the whole paginated list just to count. The endpoint returns
 * `{ data: { count } }`; the generated spec doesn't type the body (backend
 * gap), so we read it defensively.
 */
export async function fetchUnreadCount(): Promise<number> {
  const { data, error, response } = await api.GET("/api/v1/notifications/unread-count");
  if (!response.ok) throw new Error(errMessage(error, "Failed to load unread count."));
  const count = (data as { data?: { count?: number } } | undefined)?.data?.count;
  return typeof count === "number" ? count : 0;
}

export async function fetchNotifications(
  page = 1,
  limit = 50,
): Promise<Page<ApiNotification>> {
  const { data, error, response } = await api.GET("/api/v1/notifications", {
    params: { query: { page, limit } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to load notifications."));
  return { items: data?.data ?? [], meta: data?.meta };
}

export async function markNotificationRead(id: number): Promise<void> {
  const { error, response } = await api.PATCH("/api/v1/notifications/{id}/read", {
    params: { path: { id } },
  });
  if (!response.ok) throw new Error(errMessage(error, "Failed to mark as read."));
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error, response } = await api.PATCH("/api/v1/notifications/read-all");
  if (!response.ok) throw new Error(errMessage(error, "Failed to mark all as read."));
}
