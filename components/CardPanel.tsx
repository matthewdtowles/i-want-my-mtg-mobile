import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  title: string;
  /** Rendered on the heading row's right edge (e.g. the current price). */
  headerRight?: ReactNode;
  children: ReactNode;
};

/**
 * The bordered panel chrome shared by the card-detail sections (inventory,
 * buy-list, price alert, price history) — previously four identical copies.
 */
export function CardPanel({ title, headerRight, children }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>{title}</Text>
        {headerRight ?? null}
      </View>
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      backgroundColor: colors.surface,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    heading: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  });
