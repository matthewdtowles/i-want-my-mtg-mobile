import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  PORTFOLIO_SUMMARY_KEY,
  fetchPortfolioSummary,
} from "../lib/api/portfolio";
import { formatPrice } from "../lib/format";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

/**
 * The signed-in home hero: your collection's value at a glance, tapping
 * through to the portfolio. Renders nothing until the summary exists (a brand
 * new account falls back to the featured-set hero instead).
 */
export function CollectionHero() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const summary = useQuery({
    queryKey: PORTFOLIO_SUMMARY_KEY,
    queryFn: fetchPortfolioSummary,
  });

  const data = summary.data;
  if (!data) return null;

  const gain = data.totalCost != null ? data.totalValue - data.totalCost : null;
  const gainUp = gain != null && gain >= 0;

  return (
    <Link href="/portfolio" asChild>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Your collection, open portfolio"
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>YOUR COLLECTION</Text>
            <Text style={styles.value}>{formatPrice(data.totalValue)}</Text>
            <Text style={styles.meta}>
              {data.totalCards} card{data.totalCards === 1 ? "" : "s"} ·{" "}
              {data.totalQuantity} total
            </Text>
          </View>
          <View style={styles.right}>
            {gain != null ? (
              <View style={styles.gainRow}>
                <Ionicons
                  name={gainUp ? "trending-up" : "trending-down"}
                  size={16}
                  color={gainUp ? colors.success : colors.danger}
                />
                <Text style={[styles.gain, { color: gainUp ? colors.success : colors.danger }]}>
                  {gainUp ? "+" : "−"}{formatPrice(Math.abs(gain))}
                </Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 16,
    },
    pressed: { backgroundColor: colors.surfaceAlt },
    row: { flexDirection: "row", alignItems: "center" },
    label: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
    },
    value: { fontSize: 28, fontWeight: "800", color: colors.textPrimary, marginTop: 2 },
    meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    right: { flexDirection: "row", alignItems: "center", gap: 6 },
    gainRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    gain: { fontSize: 15, fontWeight: "700" },
  });
