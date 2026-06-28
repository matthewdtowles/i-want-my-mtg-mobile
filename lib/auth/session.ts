import { authApi } from "../api/client";
import type { StoredSession } from "./tokenStore";

/**
 * Exchange a refresh token for a fresh access + refresh pair (the backend
 * rotates the refresh token on each call). Throws if the refresh token is
 * invalid, revoked, or expired - the caller treats that as a real sign-out.
 */
export async function refreshSession(refreshToken: string): Promise<StoredSession> {
  const { data, response } = await authApi.POST("/api/v1/auth/refresh", {
    body: { refreshToken },
  });

  const accessToken = data?.data?.accessToken;
  const nextRefreshToken = data?.data?.refreshToken;
  if (!response.ok || !accessToken || !nextRefreshToken) {
    throw new Error("Session refresh failed");
  }
  return { accessToken, refreshToken: nextRefreshToken };
}

/**
 * Revoke a refresh token server-side on sign-out. Best-effort: a failure here
 * shouldn't block the local sign-out, which clears the tokens regardless.
 */
export async function revokeSession(refreshToken: string): Promise<void> {
  try {
    await authApi.POST("/api/v1/auth/logout", { body: { refreshToken } });
  } catch {
    // ignore - local tokens are cleared by the caller either way
  }
}
