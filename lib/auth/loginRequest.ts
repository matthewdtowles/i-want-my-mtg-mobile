import { authApi } from "../api/client";
import type { StoredSession } from "./tokenStore";

export async function login(email: string, password: string): Promise<StoredSession> {
  const { data, response } = await authApi.POST("/api/v1/auth/login", {
    body: { email, password },
  });

  if (response.status === 401) {
    throw new Error("Incorrect email or password.");
  }
  if (!response.ok) {
    throw new Error("Sign in failed. Please try again.");
  }

  const accessToken = data?.data?.accessToken;
  const refreshToken = data?.data?.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("Sign in failed: no token returned.");
  }
  return { accessToken, refreshToken };
}
