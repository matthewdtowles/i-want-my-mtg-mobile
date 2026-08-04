/**
 * Regression: MB1 (c3d6b86) — signing out left the query cache populated, so
 * the next account to sign in read the previous user's inventory/portfolio out
 * of it (query keys carry no user id).
 *
 * Revert check: delete the `queryClient.clear()` line in
 * `lib/auth/AuthContext.tsx` → both tests here fail.
 */
import { act, render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Text } from "react-native";

import * as client from "../lib/api/client";
import { AuthProvider, useAuth } from "../lib/auth/AuthContext";
import * as loginRequest from "../lib/auth/loginRequest";
import * as session from "../lib/auth/session";
import { queryClient } from "../lib/queryClient";

jest.mock("../lib/auth/session", () => ({
  RefreshRejectedError: class RefreshRejectedError extends Error {},
  refreshSession: jest.fn(),
  revokeSession: jest.fn(async () => {}),
}));

let auth: ReturnType<typeof useAuth>;

function Probe() {
  const value = useAuth();
  // After the commit, not during render — `auth` is a test handle, and writing
  // it in render is a side effect.
  useEffect(() => {
    auth = value;
  });
  return <Text>{value.isAuthenticated ? "in" : "out"}</Text>;
}

/** Renders the provider, signs in, and warms the cache with user-scoped data. */
async function signedInWithWarmCache() {
  await render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  // The provider reads the stored session on mount; that resolution is a state
  // update, so let it land before signing in.
  await waitFor(() => expect(auth.initializing).toBe(false));
  await act(async () => {
    await auth.signIn("a@example.com", "pw");
  });
  expect(auth.isAuthenticated).toBe(true);

  queryClient.setQueryData(["inventory"], [{ cardId: "c1", normalQuantity: 4 }]);
  expect(queryClient.getQueryData(["inventory"])).toBeDefined();
}

beforeEach(() => {
  queryClient.clear();
  jest
    .spyOn(loginRequest, "login")
    .mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("explicit sign-out empties the query cache", async () => {
  await signedInWithWarmCache();

  await act(async () => {
    await auth.signOut();
  });

  expect(auth.isAuthenticated).toBe(false);
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});

test("the 401 backstop empties the query cache too", async () => {
  // Capture the handler the provider registers with the API client; firing it
  // is exactly what a 401 response does.
  let onUnauthorized: (() => void) | undefined;
  jest.spyOn(client, "setOnUnauthorized").mockImplementation((handler) => {
    onUnauthorized = handler;
  });

  // The refresh the backstop attempts is rejected, so the session really is
  // over — the same path a session-expiry takes.
  (session.refreshSession as jest.Mock).mockRejectedValue(
    new session.RefreshRejectedError("rejected"),
  );

  await signedInWithWarmCache();

  await act(async () => {
    onUnauthorized?.();
  });

  await waitFor(() =>
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0),
  );
  expect(auth.sessionExpired).toBe(true);
});
