import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  title: string;
  note?: string;
};

/**
 * Temporary screen body used by the v1 tab shell. Each real feature
 * (browse, inventory, transactions, portfolio) replaces its own screen
 * in a later issue; this keeps the navigation shell runnable now.
 */
export function PlaceholderScreen({ title, note }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
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
      gap: 8,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    note: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
