import {
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { INVENTORY_KEY } from "../lib/api/inventory";
import { PORTFOLIO_KEY } from "../lib/api/portfolio";
import {
  TRANSACTIONS_KEY,
  transactionsListKey,
  deleteTransaction,
  fetchTransactions,
} from "../lib/api/transactions";
import { useSettings } from "../lib/settings/SettingsContext";
import type { Page } from "../lib/api/catalog";
import { mapPageItems, nextPage } from "../lib/pagination";
import type { ApiTransaction } from "../lib/api/types";
import { TransactionListItem } from "../components/TransactionListItem";
import { ErrorState } from "../components/ErrorState";
import { SearchField } from "../components/SearchField";
import { useDebounce } from "../lib/useDebounce";
import { useOptimisticMutation } from "../lib/useOptimisticMutation";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type TxData = InfiniteData<Page<ApiTransaction>>;

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { pageSize } = useSettings();
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 300);
  const KEY = transactionsListKey(pageSize, q);
  const query = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => fetchTransactions(pageParam, pageSize, q || undefined),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const remove = useOptimisticMutation<TxData, ApiTransaction>({
    queryKey: KEY,
    mutationFn: (tx) => deleteTransaction(tx.id),
    apply: (old, tx) => mapPageItems(old, (list) => list.filter((t) => t.id !== tx.id)),
    errorTitle: "Couldn't delete",
    // A deleted transaction re-syncs inventory and shifts portfolio totals.
    // The TRANSACTIONS_KEY prefix covers every page-size variant of the list.
    invalidates: [TRANSACTIONS_KEY, INVENTORY_KEY, PORTFOLIO_KEY],
  });

  function openActions(tx: ApiTransaction) {
    if (tx.editable === false) {
      Alert.alert(
        "Can't edit this transaction",
        "It's outside the window where transactions can still be edited.",
      );
      return;
    }
    Alert.alert(tx.cardName ?? "Transaction", `${tx.type} · ${tx.date}`, [
      {
        text: "Edit",
        onPress: () =>
          // Only the id travels; the edit screen reads the transaction from
          // the query cache (it's only reachable from this list).
          router.push({
            pathname: "/transaction/new",
            params: { id: String(tx.id) },
          }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete transaction", "This can't be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => remove.mutate(tx) },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof Error ? query.error.message : "Failed to load transactions."
        }
        onRetry={() => query.refetch()}
      />
    );
  }
  // First-ever transaction: no search active and nothing recorded.
  if (items.length === 0 && !q) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No transactions yet.</Text>
        <Text style={styles.emptyHint}>
          Open a card and tap “Log a transaction” to record a buy or sell.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search transactions by card"
        style={styles.search}
      />
      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(tx) => String(tx.id)}
        ListHeaderComponent={
          <Text style={styles.hint}>Long-press a transaction to edit or delete.</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyHint}>No transactions match your search.</Text>
        }
        renderItem={({ item }) => (
          <TransactionListItem tx={item} onLongPress={() => openActions(item)} />
        )}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor={colors.accent}
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.accent} />
          ) : null
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    search: { marginHorizontal: 16, marginTop: 8 },
    list: { backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    footer: { marginVertical: 16 },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
    },
  });
