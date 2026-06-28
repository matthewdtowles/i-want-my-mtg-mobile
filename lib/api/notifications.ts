import { api } from "./client";
import type { Page } from "./catalog";
import { errMessage } from "./envelope";
import type { ApiNotification } from "./types";

export const NOTIFICATIONS_KEY = ["notifications"] as const;

export async function fetchNotifications(
  page = 1,
  limit = 50,
): Promise<Page<ApiNotification>> {
  const { data, error, response } = await api.GET("/api/v1/notifications", {
    params: { query: { page: String(page), limit: String(limit) } },
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
