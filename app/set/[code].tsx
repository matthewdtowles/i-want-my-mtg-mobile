import { Ionicons } from "@expo/vector-icons";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  setCardsKey,
  setKey,
  fetchSet,
  fetchSetCards,
} from "../../lib/api/catalog";
import { useSettings } from "../../lib/settings/SettingsContext";
import { firstParam } from "../../lib/params";
import { nextPage } from "../../lib/pagination";
import { INVENTORY_KEY , bulkAddToInventory } from "../../lib/api/inventory";
import type { ApiCard } from "../../lib/api/types";
import { CardGridCell } from "../../components/CardGridCell";
import { CardListItem } from "../../components/CardListItem";
import { CardPeekOverlay } from "../../components/CardPeekOverlay";
import { ErrorState } from "../../components/ErrorState";
import { BulkAddBar } from "../../components/BulkAddBar";
import { SearchField } from "../../components/SearchField";
import { SetSymbol } from "../../components/SetSymbol";
import { useAuth } from "../../lib/auth/AuthContext";
import { useDebounce } from "../../lib/useDebounce";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

const GRID_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 10;

export default function SetDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ code: string | string[] }>();
  const code = firstParam(params.code);
  const { pageSize } = useSettings();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();

  // Binder grid is the default view; the header icon flips to a compact list.
  const [view, setView] = useState<"grid" | "list">("grid");
  const [peek, setPeek] = useState<ApiCard | null>(null);
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim(), 300);

  // Multi-select state: cardId -> card, so we know each card's finish support.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, ApiCard>>({});
  const selectedCards = Object.values(selected);

  const setQuery = useQuery({
    queryKey: setKey(code),
    queryFn: () => fetchSet(code as string),
    enabled: !!code,
  });

  const query = useInfiniteQuery({
    queryKey: setCardsKey(code, pageSize, q),
    queryFn: ({ pageParam }) =>
      fetchSetCards(code as string, pageParam, pageSize, q || undefined),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: !!code,
    // Keep showing the old results while a new search filter loads, so the
    // list (and the keyboard) doesn't flicker away on every keystroke.
    placeholderData: keepPreviousData,
  });

  const cards = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const addMut = useMutation({
    mutationFn: ({
      ids,
      isFoil,
      qty,
    }: {
      ids: string[];
      isFoil: boolean;
      qty: number;
      total: number;
    }) => bulkAddToInventory(ids, isFoil, qty),
    onSuccess: (added, vars) => {
      // The ["inventory"] prefix also invalidates the per-card quantities caches.
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
      // Counts are captured in `vars` at mutate() time, so a selection change
      // while the request is in flight can't skew the message.
      const skipped = vars.total - vars.ids.length;
      const finish = vars.isFoil ? "foil" : "normal";
      Alert.alert(
        "Added to inventory",
        `Added ${vars.qty} each to ${added} card${added === 1 ? "" : "s"}.` +
          (skipped > 0 ? ` ${skipped} skipped (no ${finish} printing).` : ""),
      );
      exitSelect();
    },
    onError: (e) =>
      Alert.alert("Couldn't add", e instanceof Error ? e.message : "Please try again."),
  });

  function exitSelect() {
    setSelectMode(false);
    setSelected({});
  }

  function toggle(card: ApiCard) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[card.id]) delete next[card.id];
      else next[card.id] = card;
      return next;
    });
  }

  function onAdd(isFoil: boolean, qty: number) {
    const eligible = selectedCards.filter((c) =>
      isFoil ? c.hasFoil : c.hasNonFoil,
    );
    if (eligible.length === 0) {
      Alert.alert(
        "No eligible cards",
        `None of the selected cards have a ${isFoil ? "foil" : "normal"} printing.`,
      );
      return;
    }
    addMut.mutate({
      ids: eligible.map((c) => c.id),
      isFoil,
      qty,
      total: selectedCards.length,
    });
  }

  // Selection is a checkbox-list workflow, so entering it shows the list view.
  const listMode = view === "list" || selectMode;

  const headerRight = code
    ? () => (
        <View style={styles.headerActions}>
          {!selectMode ? (
            <Pressable
              onPress={() => setView((v) => (v === "grid" ? "list" : "grid"))}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={
                view === "grid" ? "Switch to list view" : "Switch to binder view"
              }
            >
              <Ionicons
                name={view === "grid" ? "list" : "grid"}
                size={22}
                color={colors.accent}
              />
            </Pressable>
          ) : null}
          {/* Bulk-add writes to the inventory, so Select is auth-only. */}
          {isAuthenticated ? (
            <Pressable
              onPress={() => (selectMode ? exitSelect() : setSelectMode(true))}
              hitSlop={12}
              accessibilityRole="button"
            >
              <Text style={styles.headerBtnText}>{selectMode ? "Done" : "Select"}</Text>
            </Pressable>
          ) : null}
        </View>
      )
    : undefined;

  if (!code) {
    return (
      <>
        <Stack.Screen options={{ title: "Set" }} />
        <Text style={styles.message}>Set not found.</Text>
      </>
    );
  }

  const set = setQuery.data;
  const hero = (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <SetSymbol code={set?.keyruneCode || code} size={40} />
        <View style={styles.heroText}>
          <Text style={styles.heroName} numberOfLines={2}>
            {set?.name ?? code.toUpperCase()}
          </Text>
          <Text style={styles.heroSub}>
            {[
              code.toUpperCase(),
              set?.releaseDate ? set.releaseDate.slice(0, 4) : null,
              set?.baseSize != null ? `${set.baseSize} cards` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {set?.ownedTotal != null ? (
            <Text style={styles.heroOwned}>
              You own {set.ownedTotal}
              {set.completionRate != null
                ? ` · ${Math.round(set.completionRate)}% complete`
                : ""}
            </Text>
          ) : null}
        </View>
      </View>
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Search this set"
      />
    </View>
  );

  const emptyResult = (
    <Text style={styles.message}>
      {q ? "No cards match your search." : "No cards in this set."}
    </Text>
  );

  const cellWidth =
    (width - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  const refreshControl = (
    <RefreshControl
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => query.refetch()}
      tintColor={colors.accent}
    />
  );
  const footer = query.isFetchingNextPage ? (
    <ActivityIndicator style={styles.footer} color={colors.accent} />
  ) : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: set?.name ?? code.toUpperCase(), headerRight }}
      />
      {query.isPending ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      ) : query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Failed to load."}
          onRetry={() => query.refetch()}
        />
      ) : listMode ? (
        <FlatList
          style={styles.list}
          data={cards}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={hero}
          ListEmptyComponent={emptyResult}
          renderItem={({ item }) =>
            selectMode ? (
              <CardListItem
                card={item}
                selectable
                selected={!!selected[item.id]}
                onToggleSelect={() => toggle(item)}
              />
            ) : (
              <CardListItem card={item} />
            )
          }
          onEndReached={() => query.hasNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={refreshControl}
          ListFooterComponent={footer}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={cards}
          keyExtractor={(c) => c.id}
          numColumns={GRID_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={hero}
          ListEmptyComponent={emptyResult}
          renderItem={({ item }) => (
            <CardGridCell
              card={item}
              width={cellWidth}
              onPeek={setPeek}
              onPeekEnd={() => setPeek(null)}
            />
          )}
          onEndReached={() => query.hasNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={refreshControl}
          ListFooterComponent={footer}
        />
      )}

      {selectMode ? (
        <BulkAddBar
          count={selectedCards.length}
          submitting={addMut.isPending}
          onAdd={onAdd}
          onCancel={exitSelect}
        />
      ) : null}

      <CardPeekOverlay card={peek} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    list: { backgroundColor: colors.background },
    center: { marginTop: 40 },
    footer: { marginVertical: 16 },
    message: {
      textAlign: "center",
      marginTop: 40,
      color: colors.textMuted,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingHorizontal: 16,
    },
    headerBtnText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
    hero: {
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: 10,
    },
    heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    heroText: { flex: 1 },
    heroName: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
    heroSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    heroOwned: { fontSize: 13, fontWeight: "600", color: colors.accent, marginTop: 2 },
    gridRow: { gap: GRID_GAP, paddingHorizontal: GRID_PADDING },
    gridContent: { paddingBottom: 24, gap: 14 },
  });
