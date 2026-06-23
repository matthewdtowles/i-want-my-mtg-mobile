import { api } from "../api/client";

// The backend wraps responses in { success, data, error, message }. The login
// payload is { accessToken }. The OpenAPI spec doesn't declare the login
// response body (it's annotated description-only), so the generated client
// can't type it - we read the known envelope shape here.
type LoginEnvelope = { data?: { accessToken?: string } };

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

  const token = (data as unknown as LoginEnvelope | undefined)?.data?.accessToken;
  if (!token) {
    throw new Error("Sign in failed: no token returned.");
  }
  return token;
}
