import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * App-wide user preferences that aren't appearance (that's ThemeContext).
 * Persisted the same way as the theme mode, via expo-secure-store.
 */

/** How many rows long lists request per page. */
export const PAGE_SIZES = [50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 100;

type SettingsState = {
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
};

const PAGE_SIZE_KEY = "iwmm.pageSize";

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [pageSize, setPageSizeState] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  // Load the stored preference once on startup. Failures keep the default.
  useEffect(() => {
    SecureStore.getItemAsync(PAGE_SIZE_KEY)
      .then((stored) => {
        const parsed = Number(stored);
        const match = PAGE_SIZES.find((s) => s === parsed);
        if (match) setPageSizeState(match);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<SettingsState>(
    () => ({
      pageSize,
      setPageSize(next) {
        setPageSizeState(next);
        // Fire-and-forget; a SecureStore failure shouldn't break the app.
        SecureStore.setItemAsync(PAGE_SIZE_KEY, String(next)).catch(() => {});
      },
    }),
    [pageSize],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
