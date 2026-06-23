import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { fetchInventory, saveInventory, deleteInventory } from "../../lib/api/inventory";
import type { Page } from "../../lib/api/catalog";
import type { ApiInventoryItem } from "../../lib/api/types";
import { InventoryListItem } from "../../components/InventoryListItem";

type InventoryData = InfiniteData<Page<ApiInventoryItem>>;

const KEY = ["inventory"] as const;

function sameRow(a: ApiInventoryItem, b: ApiInventoryItem): boolean {
  return a.cardId === b.cardId && a.isFoil === b.isFoil;
}

function mapItems(
  data: InventoryData | undefined,
  fn: (items: ApiInventoryItem[]) => ApiInventoryItem[],
): InventoryData | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map((p) => ({ ...p, items: fn(p.items) })) };
}

function nextPage(last: Page<ApiInventoryItem>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

export default function InventoryScreen() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => fetchInventory(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  const setQuantity = useMutation({
    mutationFn: ({ item, quantity }: { item: ApiInventoryItem; quantity: number }) =>
      saveInventory([{ cardId: item.cardId, quantity, isFoil: item.isFoil }]),
    async onMutate({ item, quantity }) {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<InventoryData>(KEY);
      queryClient.setQueryData<InventoryData>(KEY, (old) =>
        mapItems(old, (items) =>
          items.map((it) => (sameRow(it, item) ? { ...it, quantity } : it)),
        ),
      );
      return { previous };
    },
    onError(_err, _vars, ctx) {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
    },
  });

  const remove = useMutation({
    mutationFn: (item: ApiInventoryItem) => deleteInventory(item.cardId, item.isFoil),
    async onMutate(item) {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<InventoryData>(KEY);
      queryClient.setQueryData<InventoryData>(KEY, (old) =>
        mapItems(old, (items) => items.filter((it) => !sameRow(it, item))),
      );
      return { previous };
    },
    onError(_err, _item, ctx) {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
    },
    // Pagination totals change on removal; resync from the server.
    onSettled() {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
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
        {query.error instanceof Error ? query.error.message : "Failed to load inventory."}
      </Text>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Your inventory is empty.</Text>
        <Text style={styles.emptyHint}>
          Find a card in Browse and add it from its page.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => `${it.cardId}-${it.isFoil}`}
      renderItem={({ item }) => (
        <InventoryListItem
          item={item}
          onIncrement={() => setQuantity.mutate({ item, quantity: item.quantity + 1 })}
          onDecrement={() => setQuantity.mutate({ item, quantity: item.quantity - 1 })}
          onRemove={() => remove.mutate(item)}
        />
      )}
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
