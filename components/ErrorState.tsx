import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  /** Message to show. Falls back to a generic line. */
  message?: string;
  /** When provided, renders a Retry button that calls this. */
  onRetry?: () => void;
  /**
   * "full" centers itself in the available space (screen-level failures);
   * "inline" is a compact block for a failed section inside a working screen
   * (card-detail panels, the account profile card).
   */
  variant?: "full" | "inline";
};

/**
 * Shared error state: a message plus an optional Retry action, so a transient
 * network failure is recoverable in place instead of a dead end.
 */
export function ErrorState({ message, onRetry, variant = "full" }: Props) {
  const styles = useThemedStyles(createStyles);

  if (variant === "inline") {
    return (
      <View style={styles.inlineContainer}>
        <Text style={styles.inlineMessage}>{message ?? "Something went wrong."}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.inlineRetry}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message ?? "Something went wrong."}</Text>
      {onRetry ? (
        <Pressable
          style={styles.button}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 16,
      backgroundColor: colors.background,
    },
    message: {
      textAlign: "center",
      fontSize: 15,
      color: colors.textMuted,
    },
    button: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 28,
      alignItems: "center",
    },
    buttonText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
    inlineContainer: { gap: 8 },
    inlineMessage: { color: colors.danger, fontSize: 14 },
    inlineRetry: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  });
