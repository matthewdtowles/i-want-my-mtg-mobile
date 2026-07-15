import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors, type ThemeColors } from "./colors";

/** User appearance preference. "system" follows the OS setting. */
export type ThemeMode = "system" | "light" | "dark";
type Scheme = "light" | "dark";

type ThemeState = {
  /** Active color tokens for the resolved scheme. */
  colors: ThemeColors;
  /** Resolved scheme after applying the user's preference. */
  scheme: Scheme;
  /** The user's stored preference (may be "system"). */
  mode: ThemeMode;
  /** Persist a new appearance preference. */
  setMode: (mode: ThemeMode) => void;
};

const MODE_KEY = "iwmm.themeMode";

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Load the stored preference once on startup. Failures fall back to "system".
  useEffect(() => {
    SecureStore.getItemAsync(MODE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeState>(() => {
    const scheme: Scheme =
      mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
    return {
      colors: scheme === "dark" ? darkColors : lightColors,
      scheme,
      mode,
      setMode(next) {
        setModeState(next);
        // Fire-and-forget; a SecureStore failure shouldn't break theming.
        SecureStore.setItemAsync(MODE_KEY, next).catch(() => {});
      },
    };
  }, [mode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * Memoize a `StyleSheet` factory against the active theme colors, so screens
 * stop repeating `useMemo(() => createStyles(colors), [colors])`. The factory is
 * a stable module-level function, so this recomputes only when the theme changes.
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
