import createClient, { type Middleware } from "openapi-fetch";

import { API_BASE_URL } from "./config";
import type { paths } from "./schema";

/**
 * How the client obtains the current auth token. Auth (issue #3) wires this
 * to the token stored in expo-secure-store; until then it returns null and
 * requests go out unauthenticated.
 */
type TokenGetter = () => string | null | Promise<string | null>;

let getToken: TokenGetter = () => null;

export function setAuthTokenGetter(getter: TokenGetter): void {
  getToken = getter;
}

/**
 * Called when the API rejects a request with 401 (expired/invalid token).
 * Auth wires this to sign the user out.
 */
let onUnauthorized: () => void = () => {};

export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler;
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = await getToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401) {
      onUnauthorized();
    }
    // Return nothing: openapi-fetch only wants a value here when *replacing*
    // the response, and it validates that value with `instanceof Response` -
    // which fails under React Native's fetch polyfill, so returning the
    // original response trips its "must return new Response()" guard.
  },
};

/**
 * Typed API client generated from the backend OpenAPI spec. Use it from
 * TanStack Query `queryFn`/`mutationFn`:
 *
 *   const { data, error } = await api.GET("/api/v1/sets");
 */
export const api = createClient<paths>({ baseUrl: API_BASE_URL });
api.use(authMiddleware);

/**
 * Bare client without the auth middleware, for the auth endpoints themselves
 * (login / refresh / logout). These take their credentials in the body, so they
 * must not get a bearer attached - and refresh must not re-trigger the proactive
 * token refresh or the 401 sign-out, which would recurse.
 */
export const authApi = createClient<paths>({ baseUrl: API_BASE_URL });
