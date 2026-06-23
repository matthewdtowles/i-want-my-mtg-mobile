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

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = await getToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
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
