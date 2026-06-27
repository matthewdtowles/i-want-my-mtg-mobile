import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  /** Message to show. Falls back to a generic line. */
  message?: string;
  /** When provided, renders a Retry button that calls this. */
  onRetry?: () => void;
};

/**
 * Shared error state: a centered message plus an optional Retry button, so a
 * transient network failure is recoverable in place instead of a dead end.
 */
export function ErrorState({ message, onRetry }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  });
