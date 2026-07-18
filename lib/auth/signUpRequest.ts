import { authApi } from "../api/client";
import { errMessage } from "../api/envelope";
import type { StoredSession } from "./tokenStore";

/**
 * Start registration: the backend stages a pending account and emails a
 * verification link. The response is deliberately uniform (it never reveals
 * whether the email was already registered), so a resolved promise just means
 * "check your email".
 */
export async function register(
  email: string,
  name: string,
  password: string,
): Promise<void> {
  const { error, response } = await authApi.POST("/api/v1/auth/register", {
    body: { email, name, password },
  });
  if (!response.ok) {
    throw new Error(errMessage(error, "Couldn't create your account. Please try again."));
  }
}

/**
 * Complete registration by exchanging the emailed verification token for an
 * access + refresh pair (the same shape login returns). Thrown on an invalid or
 * expired token (400).
 */
export async function verifyEmailToken(token: string): Promise<StoredSession> {
  const { data, error, response } = await authApi.POST("/api/v1/auth/verify-email", {
    body: { token },
  });
  const accessToken = data?.data?.accessToken;
  const refreshToken = data?.data?.refreshToken;
  if (!response.ok || !accessToken || !refreshToken) {
    throw new Error(errMessage(error, "This verification link is invalid or has expired."));
  }
  return { accessToken, refreshToken };
}
