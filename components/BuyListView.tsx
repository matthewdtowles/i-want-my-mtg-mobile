import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ApiBuyListItem } from "../lib/api/types";
import { useBuyList, useBuyListQuantity, useRemoveFromBuyList } from "../lib/hooks/useBuyList";
import { CardQuantityRow } from "./CardQuantityRow";
import { ErrorState } from "./ErrorState";
import { SearchField } from "./SearchField";
import { formatPrice } from "../lib/format";
import { useDebounce } from "../lib/useDebounce";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

function unitPrice(item: ApiBuyListItem): number {
  return (item.isFoil ? item.priceFoil : item.priceNormal) ?? 0;
}

export function BuyListView() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const query = useBuyList();
  const items = useMemo(() => query.data ?? [], [query.data]);
  const { stepBy } = useBuyListQuantity();
  const remove = useRemoveFromBuyList();

  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim().toLowerCase(), 250);
  // The buy-list arrives whole (no pagination), so search filters client-side.
  const visible = useMemo(
    () =>
      q
        ? items.filter((it) =>
            `${it.cardName ?? ""} ${it.setCode ?? ""}`.toLowerCase().includes(q),
          )
        : items,
    [items, q],
  );

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

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Failed to load buy-list."}
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
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search your buy-list"
        />
      </View>

      <FlatList
        style={styles.list}
        data={visible}
        ListEmptyComponent={
          <Text style={styles.emptyHint}>No cards match your search.</Text>
        }
        keyExtractor={(it) => `${it.cardId}-${it.isFoil}`}
        renderItem={({ item }) => (
          <CardQuantityRow
            item={item}
            onIncrement={() => stepBy(item, 1)}
            onDecrement={() => stepBy(item, -1)}
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
      gap: 8,
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
