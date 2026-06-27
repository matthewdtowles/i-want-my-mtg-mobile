import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { setAuthTokenGetter, setOnUnauthorized } from "../api/client";
import { login as loginRequest } from "./loginRequest";
import { clearToken, getStoredToken, storeToken } from "./tokenStore";

type AuthState = {
  /** True until the stored token has been loaded on startup. */
  initializing: boolean;
  isAuthenticated: boolean;
  /**
   * True when the session ended because the token expired/was rejected (a 401),
   * as opposed to an explicit sign-out. Lets the sign-in screen explain why the
   * user is back here. Cleared on a successful sign-in or manual sign-out.
   */
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Keep a ref so the API client's token getter always reads the latest token
  // without re-registering the middleware on every change.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
    setOnUnauthorized(() => {
      tokenRef.current = null;
      setToken(null);
      // Distinguish an expiry-driven sign-out from a manual one so the sign-in
      // screen can explain why the user landed back there.
      setSessionExpired(true);
      // Fire-and-forget; never let a SecureStore failure surface as an
      // unhandled rejection. In-memory state is already cleared above.
      clearToken().catch(() => {});
    });
  }, []);

  useEffect(() => {
    getStoredToken()
      .then((stored) => setToken(stored))
      .finally(() => setInitializing(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      isAuthenticated: token != null,
      sessionExpired,
      async signIn(email, password) {
        const newToken = await loginRequest(email, password);
        await storeToken(newToken);
        setSessionExpired(false);
        setToken(newToken);
      },
      async signOut() {
        // Clear in-memory state first so sign-out always completes, even if
        // SecureStore deletion fails (can happen on some devices / web).
        setSessionExpired(false);
        setToken(null);
        try {
          await clearToken();
        } catch {
          // ignore - the token is already cleared from memory
        }
      },
    }),
    [initializing, token, sessionExpired],
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
