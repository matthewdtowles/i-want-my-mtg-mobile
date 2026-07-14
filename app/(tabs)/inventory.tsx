import { Ionicons } from "@expo/vector-icons";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  INVENTORY_KEY,
  fetchInventory,
  saveInventory,
  deleteInventory,
} from "../../lib/api/inventory";
import type { Page } from "../../lib/api/catalog";
import { mapPageItems, nextPage } from "../../lib/pagination";
import type { ApiInventoryItem } from "../../lib/api/types";
import { InventoryListItem } from "../../components/InventoryListItem";
import { ErrorState } from "../../components/ErrorState";
import { formatPrice } from "../../lib/format";
import { useDebounce } from "../../lib/useDebounce";
import { useDebouncedByKey } from "../../lib/useDebouncedByKey";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

type InventoryData = InfiniteData<Page<ApiInventoryItem>>;

const KEY = INVENTORY_KEY;

type SortKey = "name" | "set" | "price" | "qty";
type Finish = "all" | "normal" | "foil";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "set", label: "Set" },
  { key: "price", label: "Price" },
  { key: "qty", label: "Qty" },
];

function sameRow(a: ApiInventoryItem, b: ApiInventoryItem): boolean {
  return a.cardId === b.cardId && a.isFoil === b.isFoil;
}

function unitPrice(item: ApiInventoryItem): number {
  return (item.isFoil ? item.priceFoil : item.priceNormal) ?? 0;
}

export default function InventoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim().toLowerCase(), 250);
  const [finish, setFinish] = useState<Finish>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const query = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => fetchInventory(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  // Load the whole collection so search/sort and the summary totals are
  // complete, not limited to the first page. FlatList still virtualizes rows.
  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  }, [query.hasNextPage, query.isFetchingNextPage, query]);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
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
    // Distinct cards, not per-finish rows (a card owned in both finishes is one).
    return { cards: cardIds.size, qty, value };
  }, [items]);

  const visible = useMemo(() => {
    const filtered = items.filter((it) => {
      if (finish === "normal" && it.isFoil) return false;
      if (finish === "foil" && !it.isFoil) return false;
      if (q) {
        const hay = `${it.cardName ?? ""} ${it.setCode ?? ""} ${it.cardNumber ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = sortAsc ? 1 : -1;
    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.cardName ?? "").localeCompare(b.cardName ?? "");
          break;
        case "set":
          cmp =
            (a.setCode ?? "").localeCompare(b.setCode ?? "") ||
            (a.cardNumber ?? "").localeCompare(b.cardNumber ?? "", undefined, {
              numeric: true,
            });
          break;
        case "price":
          cmp = unitPrice(a) - unitPrice(b);
          break;
        case "qty":
          cmp = a.quantity - b.quantity;
          break;
      }
      return cmp * dir;
    });
  }, [items, q, finish, sortKey, sortAsc]);

  // The write is debounced (below), so the mutation only fires with the final
  // absolute quantity. It carries no optimistic onMutate of its own - the tap
  // handler updates the cache instantly - and re-syncs from the server on
  // settle so any drift self-heals.
  const setQuantity = useMutation({
    mutationFn: ({ item, quantity }: { item: ApiInventoryItem; quantity: number }) =>
      saveInventory([{ cardId: item.cardId, quantity, isFoil: item.isFoil }]),
    onError(err) {
      Alert.alert(
        "Couldn't update quantity",
        err instanceof Error ? err.message : "Please try again.",
      );
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const writeQuantity = useDebouncedByKey(
    (item: ApiInventoryItem, quantity: number) => setQuantity.mutate({ item, quantity }),
  );

  // Step the quantity by ±1: read the latest value from the cache (not the
  // rendered row, which can lag a rapid double-tap), update the cache instantly
  // for a responsive UI, and debounce the server write.
  function step(item: ApiInventoryItem, delta: number) {
    const data = queryClient.getQueryData<InventoryData>(KEY);
    const current = data?.pages.flatMap((p) => p.items).find((it) => sameRow(it, item))?.quantity;
    const quantity = Math.max(1, (current ?? item.quantity) + delta);
    queryClient.setQueryData<InventoryData>(KEY, (old) =>
      mapPageItems(old, (items) =>
        items.map((it) => (sameRow(it, item) ? { ...it, quantity } : it)),
      ),
    );
    writeQuantity(`${item.cardId}-${item.isFoil}`, item, quantity);
  }

  const remove = useMutation({
    mutationFn: (item: ApiInventoryItem) => deleteInventory(item.cardId, item.isFoil),
    async onMutate(item) {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<InventoryData>(KEY);
      queryClient.setQueryData<InventoryData>(KEY, (old) =>
        mapPageItems(old, (items) => items.filter((it) => !sameRow(it, item))),
      );
      return { previous };
    },
    onError(err, _item, ctx) {
      if (ctx?.previous) queryClient.setQueryData(KEY, ctx.previous);
      Alert.alert(
        "Couldn't remove card",
        err instanceof Error ? err.message : "Please try again.",
      );
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const hub = (
    <View style={styles.hub}>
      <Pressable
        style={styles.hubBtn}
        onPress={() => router.push("/portfolio")}
        accessibilityRole="button"
      >
        <Ionicons name="pie-chart" size={16} color={colors.accent} />
        <Text style={styles.hubText}>Portfolio</Text>
      </Pressable>
      <Pressable
        style={styles.hubBtn}
        onPress={() => router.push("/transactions")}
        accessibilityRole="button"
      >
        <Ionicons name="swap-horizontal" size={16} color={colors.accent} />
        <Text style={styles.hubText}>Transactions</Text>
      </Pressable>
    </View>
  );

  if (query.isPending) {
    return (
      <View style={styles.screen}>
        {hub}
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      </View>
    );
  }
  if (query.isError) {
    return (
      <View style={styles.screen}>
        {hub}
        <ErrorState
          message={
            query.error instanceof Error ? query.error.message : "Failed to load inventory."
          }
          onRetry={() => query.refetch()}
        />
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.screen}>
        {hub}
        <View style={styles.center}>
          <Text style={styles.empty}>Your inventory is empty.</Text>
          <Text style={styles.emptyHint}>
            Open a set in Browse, tap “Select”, and add cards in bulk — or add them
            from a card’s page.
          </Text>
        </View>
      </View>
    );
  }

  const loadingMore = query.hasNextPage || query.isFetchingNextPage;

  return (
    <View style={styles.screen}>
      {hub}
      <View style={styles.controls}>
        <Text style={styles.summary}>
          {summary.cards} card{summary.cards === 1 ? "" : "s"} · {summary.qty} total ·{" "}
          {formatPrice(summary.value)}
          {loadingMore ? " · loading…" : ""}
        </Text>

        <TextInput
          style={styles.search}
          placeholder="Search your inventory"
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        <View style={styles.filterRow}>
          {(["all", "normal", "foil"] as const).map((f) => {
            const active = finish === f;
            return (
              <Pressable
                key={f}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFinish(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f === "all" ? "All" : f === "normal" ? "Normal" : "Foil"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {SORTS.map((s) => {
            const active = sortKey === s.key;
            return (
              <Pressable
                key={s.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() =>
                  active ? setSortAsc((v) => !v) : (setSortKey(s.key), setSortAsc(true))
                }
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {s.label}
                  {active ? (sortAsc ? " ↑" : " ↓") : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        style={styles.list}
        data={visible}
        keyExtractor={(it) => `${it.cardId}-${it.isFoil}`}
        renderItem={({ item }) => (
          <InventoryListItem
            item={item}
            onIncrement={() => step(item, 1)}
            onDecrement={() => step(item, -1)}
            onRemove={() => remove.mutate(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <Text style={styles.noMatch}>No cards match your filters.</Text>
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    hub: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    hubBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    hubText: { fontSize: 14, fontWeight: "600", color: colors.accent },
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
    search: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    chipTextActive: { color: colors.onAccent },
    noMatch: { textAlign: "center", marginTop: 32, color: colors.textMuted },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
    },
  });
