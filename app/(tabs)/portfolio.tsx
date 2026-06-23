import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { ApiPortfolioSummary } from "../../lib/api/types";
import { formatPrice } from "../../lib/format";

const KEY = ["portfolio", "summary"] as const;

export default function PortfolioScreen() {
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
    return <ActivityIndicator style={styles.center} size="large" />;
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
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Total value</Text>
        <Text style={styles.heroValue}>{formatPrice(summary.totalValue)}</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Cards" value={String(summary.totalCards)} />
        <Stat label="Total quantity" value={String(summary.totalQuantity)} />
        {summary.totalCost != null ? (
          <Stat label="Cost basis" value={formatPrice(summary.totalCost)} />
        ) : null}
        {summary.totalRealizedGain != null ? (
          <Stat label="Realized gain" value={formatSigned(summary.totalRealizedGain)} signed={summary.totalRealizedGain} />
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

function Stat({ label, value, signed }: { label: string; value: string; signed?: number }) {
  const color = signed == null ? "#111827" : signed >= 0 ? "#047857" : "#b91c1c";
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

const styles = StyleSheet.create({
  content: { padding: 24, gap: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  message: { textAlign: "center", marginTop: 40, color: "#6b7280" },
  empty: { fontSize: 16, fontWeight: "600", color: "#374151", textAlign: "center" },
  hero: {
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  heroLabel: { fontSize: 14, color: "#047857", fontWeight: "600" },
  heroValue: { fontSize: 40, fontWeight: "800", color: "#047857", marginTop: 4 },
  stats: { gap: 0 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  statLabel: { fontSize: 15, color: "#374151" },
  statValue: { fontSize: 16, fontWeight: "700" },
  updated: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  button: {
    borderWidth: 1,
    borderColor: "#6d28d9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#6d28d9", fontSize: 16, fontWeight: "600" },
});
