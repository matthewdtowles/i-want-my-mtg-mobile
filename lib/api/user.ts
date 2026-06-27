import { api } from "./client";
import { errMessage } from "./envelope";
import type { ApiUser } from "./types";

/** The signed-in user's profile (id, email, name, role). */
export async function fetchProfile(): Promise<ApiUser> {
  const { data, error, response } = await api.GET("/api/v1/user");
  if (!response.ok || !data?.data) {
    throw new Error(errMessage(error, "Failed to load your account."));
  }
  return data.data;
}

/**
 * Permanently delete the signed-in user's account. The server cascades the
 * scrub; the caller should sign out afterward (the token is now invalid).
 */
export async function deleteAccount(): Promise<void> {
  const { error, response } = await api.DELETE("/api/v1/user");
  if (!response.ok) {
    throw new Error(errMessage(error, "Failed to delete your account."));
  }
}
