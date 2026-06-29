import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  PRICE_ALERTS_KEY,
  deletePriceAlert,
  fetchPriceAlerts,
  updatePriceAlert,
} from "../lib/api/priceAlerts";
import type { ApiPriceAlert } from "../lib/api/types";
import { ErrorState } from "../components/ErrorState";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

export default function PriceAlertsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const router = useRouter();

  const query = useQuery({ queryKey: PRICE_ALERTS_KEY, queryFn: fetchPriceAlerts });

  const toggle = useMutation({
    mutationFn: (alert: ApiPriceAlert) =>
      updatePriceAlert(alert.id, { isActive: !alert.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICE_ALERTS_KEY }),
    onError: (e) =>
      Alert.alert("Couldn't update alert", e instanceof Error ? e.message : "Please try again."),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deletePriceAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICE_ALERTS_KEY }),
    onError: (e) =>
      Alert.alert("Couldn't delete alert", e instanceof Error ? e.message : "Please try again."),
  });

  function confirmDelete(alert: ApiPriceAlert) {
    Alert.alert("Delete alert", `Stop watching ${alert.cardName ?? "this card"}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(alert.id) },
    ]);
  }

  function openCard(alert: ApiPriceAlert) {
    if (alert.setCode && alert.cardNumber) {
      router.push({
        pathname: "/card/[setCode]/[number]",
        params: { setCode: alert.setCode, number: alert.cardNumber },
      });
    }
  }

  const header = <Stack.Screen options={{ title: "Price alerts", headerBackTitle: "Back" }} />;

  if (query.isPending) {
    return (
      <>
        {header}
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        {header}
        <ErrorState
          message={
            query.error instanceof Error ? query.error.message : "Failed to load price alerts."
          }
          onRetry={() => query.refetch()}
        />
      </>
    );
  }
  if (query.data.length === 0) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <Text style={styles.empty}>No price alerts yet.</Text>
          <Text style={styles.emptyHint}>
            Open a card and set a rise or fall percent to start watching its price.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      {header}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={query.data}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable style={styles.rowMain} onPress={() => openCard(item)}>
              <Text style={styles.cardName}>{item.cardName ?? item.cardId}</Text>
              {item.setCode && item.cardNumber ? (
                <Text style={styles.meta}>
                  {item.setCode.toUpperCase()} #{item.cardNumber}
                </Text>
              ) : null}
              <Text style={styles.thresholds}>
                {[
                  item.increasePct != null ? `Rises ≥ ${item.increasePct}%` : null,
                  item.decreasePct != null ? `Falls ≥ ${item.decreasePct}%` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {!item.isActive ? "  (paused)" : ""}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                hitSlop={8}
                onPress={() => toggle.mutate(item)}
                accessibilityLabel={item.isActive ? "Pause alert" : "Resume alert"}
              >
                <Text style={styles.actionText}>{item.isActive ? "Pause" : "Resume"}</Text>
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => confirmDelete(item)}
                accessibilityLabel="Delete alert"
              >
                <Text style={[styles.actionText, styles.danger]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.accent}
          />
        }
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, gap: 12 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 16,
    },
    rowMain: { flex: 1, gap: 2 },
    cardName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    meta: { fontSize: 13, color: colors.textSecondary },
    thresholds: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    actions: { alignItems: "flex-end", gap: 10, marginLeft: 12 },
    actionText: { fontSize: 15, fontWeight: "600", color: colors.accent },
    danger: { color: colors.danger },
  });
