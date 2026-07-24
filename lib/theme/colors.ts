/**
 * Theme color tokens. Components read these via `useTheme()` instead of
 * hardcoding literals, so the whole app responds to light/dark mode.
 *
 * When adding a token, add it to BOTH palettes (the type keeps them in sync).
 */
export type ThemeColors = {
  /** App / screen background. */
  background: string;
  /** Cards, inputs, headers, tab bar. */
  surface: string;
  /** Subtle raised/alternate background. */
  surfaceAlt: string;
  /** Hairline borders and dividers. */
  border: string;
  /** Input borders (slightly stronger than `border`). */
  inputBorder: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  placeholder: string;
  chevron: string;

  /** Brand accent (buttons, active tab, links). */
  accent: string;
  /** Text/icon on top of `accent`. */
  onAccent: string;

  /** Positive money / prices. */
  success: string;
  successBg: string;
  successBorder: string;

  /** Buy transaction badge. */
  buyBg: string;
  buyText: string;
  /** Sell transaction badge. */
  sellBg: string;
  sellText: string;

  /** Foil badge. */
  foilBg: string;
  foilText: string;
  /** Neutral badge. */
  badgeBg: string;
  badgeText: string;

  /** Errors / destructive. */
  danger: string;
  /** Image placeholder while loading. */
  imagePlaceholder: string;
};

export const lightColors: ThemeColors = {
  // Subtle off-white so white surfaces (panels, tiles, inputs) read as raised
  // sections instead of dissolving into the page.
  background: "#f7f7f9",
  surface: "#ffffff",
  surfaceAlt: "#f9fafb",
  border: "#e5e7eb",
  inputBorder: "#d1d5db",

  textPrimary: "#111827",
  textSecondary: "#374151",
  textMuted: "#6b7280",
  placeholder: "#9ca3af",
  chevron: "#9ca3af",

  accent: "#6d28d9",
  onAccent: "#ffffff",

  success: "#047857",
  successBg: "#ecfdf5",
  successBorder: "#d1fae5",

  buyBg: "#e0e7ff",
  buyText: "#4338ca",
  sellBg: "#d1fae5",
  sellText: "#047857",

  foilBg: "#ede9fe",
  foilText: "#6d28d9",
  badgeBg: "#e5e7eb",
  badgeText: "#4b5563",

  danger: "#b91c1c",
  imagePlaceholder: "#e5e7eb",
};

export const darkColors: ThemeColors = {
  background: "#0b0b0f",
  surface: "#16161c",
  surfaceAlt: "#1f1f27",
  border: "#2a2a33",
  inputBorder: "#3a3a44",

  textPrimary: "#f5f5f7",
  textSecondary: "#d1d5db",
  textMuted: "#9ca3af",
  placeholder: "#6b7280",
  chevron: "#6b7280",

  accent: "#8b5cf6",
  onAccent: "#ffffff",

  success: "#34d399",
  successBg: "#0f2e22",
  successBorder: "#155e44",

  buyBg: "#312e81",
  buyText: "#c7d2fe",
  sellBg: "#0f2e22",
  sellText: "#6ee7b7",

  foilBg: "#3b2f6b",
  foilText: "#c4b5fd",
  badgeBg: "#2a2a33",
  badgeText: "#d1d5db",

  danger: "#f87171",
  imagePlaceholder: "#2a2a33",
};
