import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { fetchTransactions } from "../../lib/api/transactions";
import type { Page } from "../../lib/api/catalog";
import type { ApiTransaction } from "../../lib/api/types";
import { TransactionListItem } from "../../components/TransactionListItem";

function nextPage(last: Page<ApiTransaction>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

export default function TransactionsScreen() {
  const query = useInfiniteQuery({
    queryKey: ["transactions"],
    queryFn: ({ pageParam }) => fetchTransactions(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (query.isError) {
    return (
      <Text style={styles.message}>
        {query.error instanceof Error ? query.error.message : "Failed to load transactions."}
      </Text>
    );
  }
  if (items.length === 0) {
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
    <FlatList
      data={items}
      keyExtractor={(tx) => String(tx.id)}
      renderItem={({ item }) => <TransactionListItem tx={item} />}
      onEndReached={() => query.hasNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  footer: { marginVertical: 16 },
  message: { textAlign: "center", marginTop: 40, color: "#6b7280" },
  empty: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptyHint: { fontSize: 14, color: "#6b7280", marginTop: 6, textAlign: "center" },
});
