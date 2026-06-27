import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fetchPortfolioSummary, refreshPortfolio } from "../../lib/api/portfolio";
import { formatPrice } from "../../lib/format";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

const KEY = ["portfolio", "summary"] as const;

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchPortfolioSummary,
  });

  const recalc = useMutation({
    mutationFn: refreshPortfolio,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
    onError: (e) =>
      Alert.alert(
        "Couldn't refresh",
        e instanceof Error ? e.message : "Please try again.",
      ),
  });

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;
  }
  if (query.isError) {
    return (
      <Text style={styles.message}>
        {query.error instanceof Error ? query.error.message : "Failed to load portfolio."}
      </Text>
    );
  }

  const summary = query.data;

  if (!summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Your portfolio hasn’t been calculated yet.</Text>
        <Pressable
          style={[styles.button, recalc.isPending && styles.buttonDisabled]}
          onPress={() => recalc.mutate()}
          disabled={recalc.isPending}
        >
          <Text style={styles.buttonText}>
            {recalc.isPending ? "Calculating…" : "Calculate portfolio"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Total value</Text>
        <Text style={styles.heroValue}>{formatPrice(summary.totalValue)}</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Cards" value={String(summary.totalCards)} styles={styles} colors={colors} />
        <Stat
          label="Total quantity"
          value={String(summary.totalQuantity)}
          styles={styles}
          colors={colors}
        />
        {summary.totalCost != null ? (
          <Stat label="Cost basis" value={formatPrice(summary.totalCost)} styles={styles} colors={colors} />
        ) : null}
        {summary.totalRealizedGain != null ? (
          <Stat
            label="Realized gain"
            value={formatSigned(summary.totalRealizedGain)}
            signed={summary.totalRealizedGain}
            styles={styles}
            colors={colors}
          />
        ) : null}
      </View>

      <Text style={styles.updated}>Updated {formatComputedAt(summary.computedAt)}</Text>

      <Pressable
        style={[styles.button, recalc.isPending && styles.buttonDisabled]}
        onPress={() => recalc.mutate()}
        disabled={recalc.isPending}
      >
        <Text style={styles.buttonText}>
          {recalc.isPending ? "Recalculating…" : "Recalculate"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  signed,
  styles,
  colors,
}: {
  label: string;
  value: string;
  signed?: number;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  const color =
    signed == null ? colors.textPrimary : signed >= 0 ? colors.success : colors.danger;
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function formatSigned(v: number): string {
  return `${v >= 0 ? "+" : "-"}${formatPrice(Math.abs(v))}`;
}

function formatComputedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background },
    content: { padding: 24, gap: 20 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 16,
      backgroundColor: colors.background,
    },
    message: { textAlign: "center", marginTop: 40, color: colors.textMuted },
    empty: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      textAlign: "center",
    },
    hero: {
      backgroundColor: colors.successBg,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
    },
    heroLabel: { fontSize: 14, color: colors.success, fontWeight: "600" },
    heroValue: { fontSize: 40, fontWeight: "800", color: colors.success, marginTop: 4 },
    stats: { gap: 0 },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    statLabel: { fontSize: 15, color: colors.textSecondary },
    statValue: { fontSize: 16, fontWeight: "700" },
    updated: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
    button: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  });
