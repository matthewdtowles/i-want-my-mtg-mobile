import { Ionicons } from "@expo/vector-icons";
import {
  keepPreviousData,
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
  useWindowDimensions,
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
import { buildEntries, entryKey, type Entry } from "../../lib/inventoryEntries";
import { mapPageItems, nextPage } from "../../lib/pagination";
import type { ApiInventoryItem } from "../../lib/api/types";
import { CardQuantityRow } from "../../components/CardQuantityRow";
import { Chip } from "../../components/Chip";
import { ErrorState } from "../../components/ErrorState";
import { InventoryGridCell } from "../../components/InventoryGridCell";
import { SearchField } from "../../components/SearchField";
import { SetSymbol } from "../../components/SetSymbol";
import { SignInPrompt } from "../../components/SignInPrompt";
import { formatPrice } from "../../lib/format";
import { useAuth } from "../../lib/auth/AuthContext";
import { useDebounce } from "../../lib/useDebounce";
import { useDebouncedByKey } from "../../lib/useDebouncedByKey";
import { useOptimisticMutation } from "../../lib/useOptimisticMutation";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

type InventoryData = InfiniteData<Page<ApiInventoryItem>>;

type SortKey = "name" | "value" | "qty";
type Finish = "all" | "normal" | "foil";

const GRID_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 10;

/**
 * UI sort keys mapped to the backend's SortOptions values. `asc` is the
 * direction a key opens in when first picked — names read A-Z, but "sort by
 * value" means the expensive cards first. Value's `server` is its normal-finish
 * default; `sortServer` below swaps in the foil price when the foil filter is on.
 */
const SORTS: { key: SortKey; label: string; server: string; asc: boolean }[] = [
  { key: "name", label: "Name", server: "card.name", asc: true },
  { key: "value", label: "Value", server: "prices.normal", asc: false },
  { key: "qty", label: "Qty", server: "inventory.quantity", asc: true },
];

/**
 * Grouping by set is a mode, not a sort: it takes over the ordering (newest set
 * first, which is how collectors think about their binders) so that rows for one
 * set arrive contiguously and can carry a section header.
 */
const GROUP_SORT = "set.releaseDate";

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
  const { width } = useWindowDimensions();

  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 250);
  const [finish, setFinish] = useState<Finish>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [grouped, setGrouped] = useState(false);
  // Binder grid is the default, matching a set's page; the header icon flips
  // to the compact list with its always-visible steppers.
  const [view, setView] = useState<"grid" | "list">("grid");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Search, sort, finish, and pagination all happen server-side now: the app
  // only holds the pages the user has scrolled through, not the whole
  // collection.
  // Value ranks by the price of the finish you're looking at. The API coalesces
  // to the other finish, so a card printed only one way still ranks by the
  // price it has instead of falling to the bottom with the unpriced ones.
  const sortServer =
    sortKey === "value" && finish === "foil"
      ? "prices.foil"
      : SORTS.find((s) => s.key === sortKey)?.server;
  const listOpts = {
    filter: q || undefined,
    finish: finish === "all" ? undefined : finish,
    sort: grouped ? GROUP_SORT : sortServer,
    ascend: grouped ? false : sortAsc,
  };
  const listKey = inventoryListKey(listOpts);

  const query = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam }) => fetchInventory({ ...listOpts, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    // Keep the old rows while a new filter/sort loads so the list doesn't
    // flash a spinner on every keystroke.
    placeholderData: keepPreviousData,
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

  const columns = view === "grid" ? GRID_COLUMNS : 1;
  const entries = useMemo(
    () => buildEntries(items, grouped, columns),
    [items, grouped, columns],
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
    writeQuantity(entryKey(item), item, quantity);
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
      <Pressable
        style={styles.viewBtn}
        onPress={() => {
          setView((v) => (v === "grid" ? "list" : "grid"));
          setExpanded(null);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          view === "grid" ? "Switch to list view" : "Switch to binder view"
        }
      >
        <Ionicons
          name={view === "grid" ? "list" : "grid"}
          size={18}
          color={colors.accent}
        />
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

  // Empty collection (not just an empty filter result): no filters and no rows.
  if (!query.isPending && !q && finish === "all" && items.length === 0) {
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

  const cellWidth =
    (width - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  function renderEntry(entry: Entry<ApiInventoryItem>) {
    if (entry.kind === "header") {
      // The header is the way into that set's binder: the full checklist with
      // the cards you're missing faded in behind the ones you have.
      return (
        <Pressable
          style={styles.setHeader}
          onPress={() =>
            router.push({
              pathname: "/set/[code]",
              params: { code: entry.setCode, collection: "1" },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open the ${entry.setCode.toUpperCase()} binder`}
        >
          <SetSymbol code={entry.keyruneCode || entry.setCode} size={20} />
          <Text style={styles.setHeaderText}>{entry.setCode.toUpperCase()}</Text>
          <Text style={styles.setHeaderCount}>
            {entry.count} loaded
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </Pressable>
      );
    }
    if (view === "list") {
      const item = entry.items[0];
      return (
        <CardQuantityRow
          item={item}
          onIncrement={() => step(item, 1)}
          onDecrement={() => step(item, -1)}
          onRemove={() => remove.mutate(item)}
        />
      );
    }
    return (
      <View style={styles.gridRow}>
        {entry.items.map((item) => (
          <InventoryGridCell
            key={entryKey(item)}
            item={item}
            width={cellWidth}
            expanded={expanded === entryKey(item)}
            onToggleExpand={() =>
              setExpanded((cur) => (cur === entryKey(item) ? null : entryKey(item)))
            }
            onIncrement={() => step(item, 1)}
            onDecrement={() => step(item, -1)}
            onRemove={() => remove.mutate(item)}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {hub}
      <View style={styles.controls}>
        <Text style={styles.summary}>{summaryLine}</Text>

        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search your inventory"
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
          <Chip
            label="By set"
            active={grouped}
            onPress={() => {
              setGrouped((v) => !v);
              setExpanded(null);
            }}
          />
        </View>

        {/* Grouping owns the ordering, so the sort chips step aside while it's on. */}
        {!grouped ? (
          <View style={styles.filterRow}>
            {SORTS.map((s) => {
              const active = sortKey === s.key;
              return (
                <Chip
                  key={s.key}
                  label={`${s.label}${active ? (sortAsc ? " ↑" : " ↓") : ""}`}
                  active={active}
                  onPress={() =>
                    active ? setSortAsc((v) => !v) : (setSortKey(s.key), setSortAsc(s.asc))
                  }
                />
              );
            })}
          </View>
        ) : null}
      </View>

      {query.isPending ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={entries}
          keyExtractor={(e) => e.key}
          renderItem={({ item }) => renderEntry(item)}
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
    viewBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    list: { backgroundColor: colors.background },
    listContent: { paddingBottom: 24 },
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
    filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    gridRow: {
      flexDirection: "row",
      gap: GRID_GAP,
      paddingHorizontal: GRID_PADDING,
      marginTop: 14,
    },
    setHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: GRID_PADDING,
      paddingTop: 18,
      paddingBottom: 2,
    },
    setHeaderText: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: colors.textPrimary,
    },
    setHeaderCount: { fontSize: 12, color: colors.textMuted, marginLeft: "auto" },
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
