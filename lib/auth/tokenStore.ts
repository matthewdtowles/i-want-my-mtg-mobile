import * as SecureStore from "expo-secure-store";

// Access token keeps its original key so sessions from before persistent-login
// (#25) survive an app update. The refresh token is new.
const ACCESS_KEY = "iwmm.authToken";
const REFRESH_KEY = "iwmm.refreshToken";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
};

/** The persisted access and refresh tokens; either may be null independently. */
export async function getStoredSession(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function storeSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
