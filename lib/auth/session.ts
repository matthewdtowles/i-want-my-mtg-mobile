import { authApi } from "../api/client";
import type { StoredSession } from "./tokenStore";

/**
 * The refresh token itself was rejected (invalid / revoked / expired, i.e. a
 * 401). Distinct from a transient failure (network / 5xx) so the caller can
 * sign the user out only on a real rejection.
 */
export class RefreshRejectedError extends Error {}

/**
 * Exchange a refresh token for a fresh access + refresh pair (the backend
 * rotates the refresh token on each call). Throws `RefreshRejectedError` when
 * the token is rejected (401) - a real sign-out - and a generic Error for
 * transient failures, which the caller should not treat as a sign-out.
 */
export async function refreshSession(refreshToken: string): Promise<StoredSession> {
  const { data, response } = await authApi.POST("/api/v1/auth/refresh", {
    body: { refreshToken },
  });

  if (response.status === 401) {
    throw new RefreshRejectedError("Refresh token rejected");
  }
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
