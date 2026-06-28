import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fetchBuyList, removeFromBuyList, setBuyListQuantity } from "../../lib/api/buyList";
import type { ApiBuyListItem } from "../../lib/api/types";
import { BuyListListItem } from "../../components/BuyListListItem";
import { ErrorState } from "../../components/ErrorState";
import { formatPrice } from "../../lib/format";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

const KEY = ["buy-list"] as const;

function sameRow(a: ApiBuyListItem, b: ApiBuyListItem): boolean {
  return a.cardId === b.cardId && a.isFoil === b.isFoil;
}

function unitPrice(item: ApiBuyListItem): number {
  return (item.isFoil ? item.priceFoil : item.priceNormal) ?? 0;
}

export default function BuyListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: KEY, queryFn: fetchBuyList });
  const items = useMemo(() => query.data ?? [], [query.data]);

  const summary = useMemo(() => {
    let qty = 0;
    let value = 0;
    const cardIds = new Set<string>();
    for (const it of items) {
      qty += it.quantity;
      value += it.quantity * unitPrice(it);
      cardIds.add(it.cardId);
    }
    return { cards: cardIds.size, qty, value };
  }, [items]);

  const setQuantity = useMutation({
    mutationFn: ({ item, quantity }: { item: ApiBuyListItem; quantity: number }) =>
      setBuyListQuantity(item.cardId, item.isFoil, quantity),
    async onMutate({ item, quantity }) {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<ApiBuyListItem[]>(KEY);
      queryClient.setQueryData<ApiBuyListItem[]>(KEY, (old) =>
        (old ?? []).map((it) => (sameRow(it, item) ? { ...it, quantity } : it)),
      );
      return { previous };
    },
    onError(_err, _vars, ctx) {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
    },
  });

  const remove = useMutation({
    mutationFn: (item: ApiBuyListItem) => removeFromBuyList(item.cardId, item.isFoil),
    async onMutate(item) {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<ApiBuyListItem[]>(KEY);
      queryClient.setQueryData<ApiBuyListItem[]>(KEY, (old) =>
        (old ?? []).filter((it) => !sameRow(it, item)),
      );
      return { previous };
    },
    onError(_err, _item, ctx) {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof Error ? query.error.message : "Failed to load buy-list."
        }
        onRetry={() => query.refetch()}
      />
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Your buy-list is empty.</Text>
        <Text style={styles.emptyHint}>
          Open a card and use the “On your buy-list” steppers to track cards you
          want to buy.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <Text style={styles.summary}>
          {summary.cards} card{summary.cards === 1 ? "" : "s"} · {summary.qty} wanted ·{" "}
          {formatPrice(summary.value)}
        </Text>
      </View>

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(it) => `${it.cardId}-${it.isFoil}`}
        renderItem={({ item }) => (
          <BuyListListItem
            item={item}
            onIncrement={() => setQuantity.mutate({ item, quantity: item.quantity + 1 })}
            onDecrement={() => setQuantity.mutate({ item, quantity: item.quantity - 1 })}
            onRemove={() => remove.mutate(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.accent}
          />
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    list: { backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    controls: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    summary: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
    },
  });
