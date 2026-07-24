import { Ionicons } from "@expo/vector-icons";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  inventoryListKey,
  fetchInventory,
  saveInventory,
  deleteInventory,
} from "../../lib/api/inventory";
import {
  PORTFOLIO_KEY,
  PORTFOLIO_SUMMARY_KEY,
  fetchPortfolioSummary,
} from "../../lib/api/portfolio";
import type { Page } from "../../lib/api/catalog";
import { mapPageItems, nextPage } from "../../lib/pagination";
import type { ApiInventoryItem } from "../../lib/api/types";
import { CardQuantityRow } from "../../components/CardQuantityRow";
import { Chip } from "../../components/Chip";
import { ErrorState } from "../../components/ErrorState";
import { SignInPrompt } from "../../components/SignInPrompt";
import { formatPrice } from "../../lib/format";
import { useAuth } from "../../lib/auth/AuthContext";
import { useDebounce } from "../../lib/useDebounce";
import { useDebouncedByKey } from "../../lib/useDebouncedByKey";
import { useOptimisticMutation } from "../../lib/useOptimisticMutation";
import { useSettings } from "../../lib/settings/SettingsContext";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

type InventoryData = InfiniteData<Page<ApiInventoryItem>>;

type SortKey = "name" | "set" | "price" | "qty";
type Finish = "all" | "normal" | "foil";

/** UI sort keys mapped to the backend's SortOptions values. */
const SORTS: { key: SortKey; label: string; server: string }[] = [
  { key: "name", label: "Name", server: "card.name" },
  { key: "set", label: "Set", server: "card.setCode" },
  { key: "price", label: "Price", server: "prices.normal" },
  { key: "qty", label: "Qty", server: "inventory.quantity" },
];

function sameRow(a: ApiInventoryItem, b: ApiInventoryItem): boolean {
  return a.cardId === b.cardId && a.isFoil === b.isFoil;
}

export default function InventoryScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <SignInPrompt
        title="Your inventory lives here"
        message="Sign in to track the cards you own, their quantities, and what your collection is worth."
      />
    );
  }
  return <InventoryList />;
}

function InventoryList() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pageSize } = useSettings();

  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 250);
  const [finish, setFinish] = useState<Finish>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Search, sort, and pagination all happen server-side now: the app only
  // holds the pages the user has scrolled through, not the whole collection.
  const listOpts = {
    filter: q || undefined,
    sort: SORTS.find((s) => s.key === sortKey)?.server,
    ascend: sortAsc,
    limit: pageSize,
  };
  const listKey = inventoryListKey(listOpts);

  const query = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam }) => fetchInventory({ ...listOpts, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  // Collection-wide totals come from the portfolio summary (already computed
  // server-side), not from summing loaded pages.
  const summary = useQuery({
    queryKey: PORTFOLIO_SUMMARY_KEY,
    queryFn: fetchPortfolioSummary,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.meta?.total;

  // The finish chips filter the loaded rows (the API has no finish filter).
  const visible = useMemo(
    () =>
      finish === "all"
        ? items
        : items.filter((it) => (finish === "foil" ? it.isFoil : !it.isFoil)),
    [items, finish],
  );

  // The write is debounced (below), so the mutation only fires with the final
  // absolute quantity. It carries no optimistic `apply` of its own - the tap
  // handler updates the cache instantly - and re-syncs from the server on
  // settle so any drift self-heals.
  const setQuantity = useOptimisticMutation<
    InventoryData,
    { item: ApiInventoryItem; quantity: number }
  >({
    queryKey: listKey,
    mutationFn: ({ item, quantity }) =>
      saveInventory([{ cardId: item.cardId, quantity, isFoil: item.isFoil }]),
    errorTitle: "Couldn't update quantity",
    invalidates: [INVENTORY_KEY, PORTFOLIO_KEY],
  });

  const writeQuantity = useDebouncedByKey(
    (item: ApiInventoryItem, quantity: number) => setQuantity.mutate({ item, quantity }),
  );

  // Step the quantity by ±1: read the latest value from the cache (not the
  // rendered row, which can lag a rapid double-tap), update the cache instantly
  // for a responsive UI, and debounce the server write.
  function step(item: ApiInventoryItem, delta: number) {
    const data = queryClient.getQueryData<InventoryData>(listKey);
    const current = data?.pages.flatMap((p) => p.items).find((it) => sameRow(it, item))?.quantity;
    const quantity = Math.max(1, (current ?? item.quantity) + delta);
    queryClient.setQueryData<InventoryData>(listKey, (old) =>
      mapPageItems(old, (items) =>
        items.map((it) => (sameRow(it, item) ? { ...it, quantity } : it)),
      ),
    );
    writeQuantity(`${item.cardId}-${item.isFoil}`, item, quantity);
  }

  const remove = useOptimisticMutation<InventoryData, ApiInventoryItem>({
    queryKey: listKey,
    mutationFn: (item) => deleteInventory(item.cardId, item.isFoil),
    apply: (old, item) =>
      mapPageItems(old, (items) => items.filter((it) => !sameRow(it, item))),
    errorTitle: "Couldn't remove card",
    invalidates: [INVENTORY_KEY, PORTFOLIO_KEY],
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

  // Empty collection (not just an empty filter result): no query and no rows.
  if (!query.isPending && !q && items.length === 0) {
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

  const summaryLine = summary.data
    ? `${summary.data.totalCards} card${summary.data.totalCards === 1 ? "" : "s"} · ${
        summary.data.totalQuantity
      } total · ${formatPrice(summary.data.totalValue)}`
    : total != null
      ? `${total} item${total === 1 ? "" : "s"}`
      : " ";

  return (
    <View style={styles.screen}>
      {hub}
      <View style={styles.controls}>
        <Text style={styles.summary}>{summaryLine}</Text>

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
          {(["all", "normal", "foil"] as const).map((f) => (
            <Chip
              key={f}
              label={f === "all" ? "All" : f === "normal" ? "Normal" : "Foil"}
              active={finish === f}
              onPress={() => setFinish(f)}
            />
          ))}
        </View>

        <View style={styles.filterRow}>
          {SORTS.map((s) => {
            const active = sortKey === s.key;
            return (
              <Chip
                key={s.key}
                label={`${s.label}${active ? (sortAsc ? " ↑" : " ↓") : ""}`}
                active={active}
                onPress={() =>
                  active ? setSortAsc((v) => !v) : (setSortKey(s.key), setSortAsc(true))
                }
              />
            );
          })}
        </View>
      </View>

      {query.isPending ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      ) : (
        <FlatList
          style={styles.list}
          data={visible}
          keyExtractor={(it) => `${it.cardId}-${it.isFoil}`}
          renderItem={({ item }) => (
            <CardQuantityRow
              item={item}
              onIncrement={() => step(item, 1)}
              onDecrement={() => step(item, -1)}
              onRemove={() => remove.mutate(item)}
            />
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
          ListEmptyComponent={
            <Text style={styles.noMatch}>No cards match your filters.</Text>
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.accent} />
            ) : total != null && items.length < total ? (
              <Text style={styles.footerHint}>
                Showing {items.length} of {total} · scroll for more
              </Text>
            ) : null
          }
        />
      )}
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
    footer: { marginVertical: 16 },
    footerHint: {
      textAlign: "center",
      marginVertical: 14,
      fontSize: 12,
      color: colors.textMuted,
    },
    noMatch: { textAlign: "center", marginTop: 32, color: colors.textMuted },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: "center",
    },
  });
