import { api } from "../api/client";

export async function login(email: string, password: string): Promise<string> {
  const { data, response } = await api.POST("/api/v1/auth/login", {
    body: { email, password },
  });

  if (response.status === 401) {
    throw new Error("Incorrect email or password.");
  }
  if (!response.ok) {
    throw new Error("Sign in failed. Please try again.");
  }

  const token = data?.data?.accessToken;
  if (!token) {
    throw new Error("Sign in failed: no token returned.");
  }
  return token;
}
