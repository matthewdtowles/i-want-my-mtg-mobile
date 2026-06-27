import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { deleteTransaction, fetchTransactions } from "../../lib/api/transactions";
import type { Page } from "../../lib/api/catalog";
import type { ApiTransaction } from "../../lib/api/types";
import { TransactionListItem } from "../../components/TransactionListItem";
import { ErrorState } from "../../components/ErrorState";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

const KEY = ["transactions"] as const;
type TxData = InfiniteData<Page<ApiTransaction>>;

function nextPage(last: Page<ApiTransaction>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => fetchTransactions(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const remove = useMutation({
    mutationFn: (tx: ApiTransaction) => deleteTransaction(tx.id),
    async onMutate(tx) {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<TxData>(KEY);
      queryClient.setQueryData<TxData>(KEY, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                items: p.items.filter((t) => t.id !== tx.id),
              })),
            }
          : old,
      );
      return { previous };
    },
    onError(_err, _tx, ctx) {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
      Alert.alert("Couldn't delete", "Please try again.");
    },
    onSettled() {
      // A deleted transaction re-syncs inventory server-side.
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  function openActions(tx: ApiTransaction) {
    if (tx.editable === false) {
      Alert.alert(
        "Can't edit this transaction",
        "It's outside the editable window for your plan.",
      );
      return;
    }
    Alert.alert(tx.cardName ?? "Transaction", `${tx.type} · ${tx.date}`, [
      {
        text: "Edit",
        onPress: () =>
          router.push({
            pathname: "/transaction/new",
            params: {
              id: String(tx.id),
              cardId: tx.cardId,
              name: tx.cardName ?? "",
              setCode: tx.setCode ?? "",
              number: tx.cardNumber ?? "",
              type: tx.type,
              quantity: String(tx.quantity),
              price: String(tx.pricePerUnit),
              isFoil: String(tx.isFoil),
              date: tx.date,
              notes: tx.notes ?? "",
            },
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
      style={styles.list}
      data={items}
      keyExtractor={(tx) => String(tx.id)}
      ListHeaderComponent={
        <Text style={styles.hint}>Long-press a transaction to edit or delete.</Text>
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
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
