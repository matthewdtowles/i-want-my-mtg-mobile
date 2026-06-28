import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { setAuthTokenGetter, setOnUnauthorized } from "../api/client";
import { isExpiringSoon } from "./jwt";
import { login as loginRequest } from "./loginRequest";
import { refreshSession, revokeSession } from "./session";
import {
  clearSession,
  getStoredSession,
  storeSession,
  type StoredSession,
} from "./tokenStore";

type AuthState = {
  /** True until the stored session has been loaded on startup. */
  initializing: boolean;
  isAuthenticated: boolean;
  /**
   * True when the session ended because it expired / was rejected (a 401 that
   * a refresh couldn't recover), as opposed to an explicit sign-out. Lets the
   * sign-in screen explain why the user is back here. Cleared on a successful
   * sign-in or manual sign-out.
   */
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Refs mirror state so the API client's token getter (registered once) always
  // reads the latest tokens without re-registering on every change.
  const accessRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  accessRef.current = accessToken;
  refreshRef.current = refreshToken;

  // Holds an in-flight refresh so concurrent expired requests share one call
  // (and don't stampede the rotating refresh token).
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((session: StoredSession) => {
    accessRef.current = session.accessToken;
    refreshRef.current = session.refreshToken;
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    storeSession(session).catch(() => {});
  }, []);

  const handleSignedOut = useCallback((expired: boolean) => {
    accessRef.current = null;
    refreshRef.current = null;
    setAccessToken(null);
    setRefreshToken(null);
    if (expired) setSessionExpired(true);
    clearSession().catch(() => {});
  }, []);

  // Single-flight refresh: returns a fresh access token, or null if there's no
  // refresh token or the refresh was rejected (in which case we sign out).
  const ensureFreshAccessToken = useCallback((): Promise<string | null> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const rt = refreshRef.current;
    if (!rt) return Promise.resolve(null);
    const p = refreshSession(rt)
      .then((session) => {
        applySession(session);
        return session.accessToken;
      })
      .catch(() => {
        handleSignedOut(true);
        return null;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });
    refreshPromiseRef.current = p;
    return p;
  }, [applySession, handleSignedOut]);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      const access = accessRef.current;
      if (access && !isExpiringSoon(access)) return access;
      // Missing or (near-)expired: refresh if we can, else send what we have
      // and let the 401 backstop sign out.
      if (refreshRef.current) return await ensureFreshAccessToken();
      return access;
    });

    setOnUnauthorized(() => {
      // A refresh is already resolving this 401 - don't sign out from under it.
      if (refreshPromiseRef.current) return;
      // Last resort (e.g. clock skew let an expired token through): try a
      // refresh; it signs out itself if the refresh token is also rejected.
      if (refreshRef.current) {
        void ensureFreshAccessToken();
        return;
      }
      handleSignedOut(accessRef.current != null);
    });
  }, [ensureFreshAccessToken, handleSignedOut]);

  useEffect(() => {
    getStoredSession()
      .then(({ accessToken: a, refreshToken: r }) => {
        accessRef.current = a;
        refreshRef.current = r;
        setAccessToken(a);
        setRefreshToken(r);
      })
      .finally(() => setInitializing(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      isAuthenticated: accessToken != null || refreshToken != null,
      sessionExpired,
      async signIn(email, password) {
        const session = await loginRequest(email, password);
        setSessionExpired(false);
        applySession(session);
      },
      async signOut() {
        const rt = refreshRef.current;
        setSessionExpired(false);
        handleSignedOut(false);
        // Revoke the refresh token server-side; best-effort, already cleared
        // locally.
        if (rt) void revokeSession(rt);
      },
    }),
    [initializing, accessToken, refreshToken, sessionExpired, applySession, handleSignedOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
