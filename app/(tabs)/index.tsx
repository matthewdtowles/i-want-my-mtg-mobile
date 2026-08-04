import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  setsKey,
  cardsSearchKey,
  fetchSets,
  searchCards,
  type CardSearchMode,
  type Page,
  type SetPage,
  type SetSort,
} from "../../lib/api/catalog";
import { nextPage } from "../../lib/pagination";
import { buildSetEntries, type SetEntry } from "../../lib/setBlocks";
import type { ApiCard, ApiSet } from "../../lib/api/types";
import { CardListItem } from "../../components/CardListItem";
import { Chip } from "../../components/Chip";
import { CollectionHero } from "../../components/CollectionHero";
import { ErrorState } from "../../components/ErrorState";
import { SearchField } from "../../components/SearchField";
import { SegmentedControl } from "../../components/SegmentedControl";
import { SetPeekOverlay } from "../../components/SetPeekOverlay";
import { SetTile } from "../../components/SetTile";
import { useAuth } from "../../lib/auth/AuthContext";
import { useDebounce } from "../../lib/useDebounce";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

/** What the search box searches. Sets is the default — this is the set gallery. */
type Scope = "sets" | "cards";

const SCOPES = [
  { label: "Sets", value: "sets" as const },
  { label: "Cards", value: "cards" as const },
];

/**
 * How the gallery is arranged: one of the API's sorts, or its block grouping.
 * They are one control because the API refuses to combine them — `group=block`
 * is silently dropped whenever a sort is sent — so a single choice is the only
 * way a lit chip always describes what came back.
 */
type SetOrder = SetSort | "block";

/**
 * Set orderings, each with the direction it should start in. Release date
 * defaults to newest-first (the gallery's long-standing order); name to A–Z;
 * value to most-valuable-first, which is the point of picking it.
 */
const SET_SORTS: { key: SetSort; label: string; startAscending: boolean }[] = [
  { key: "set.releaseDate", label: "Release", startAscending: false },
  { key: "set.name", label: "Name", startAscending: true },
  { key: "setPrice.basePrice", label: "Value", startAscending: false },
];

/** The order the gallery falls back to when grouping can't apply. */
const DEFAULT_SORT = SET_SORTS[0];

/** How far a block's sets sit in from its header. */
const BLOCK_INDENT = 12;

/**
 * The set-list scope, matching the web app's "Main Only"/"Show All" toggle.
 * Main is the default on both — and is what this list has always shown, since
 * the API treats an absent `baseOnly` as true. All sets is ~4.5x longer.
 */
const SET_SCOPES = [
  { label: "Main only", value: true },
  { label: "All sets", value: false },
];

/** How card search reports a name that was printed more than once. */
const CARD_MODES: { label: string; value: CardSearchMode }[] = [
  { label: "Unique", value: "unique" },
  { label: "All printings", value: "printings" },
];

export default function BrowseScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [scope, setScope] = useState<Scope>("sets");
  const [query, setQuery] = useState("");
  const q = useDebounce(query.trim(), 350);

  const [order, setOrder] = useState<SetOrder>(DEFAULT_SORT.key);
  const [ascend, setAscend] = useState(DEFAULT_SORT.startAscending);
  const [baseOnly, setBaseOnly] = useState(true);
  const [cardMode, setCardMode] = useState<CardSearchMode>("unique");

  // The API also drops grouping once there's a search term, so searching falls
  // back to the default sort — the Block chip goes dark rather than staying lit
  // over a list the server flattened anyway. Clearing the search restores it.
  const grouped = order === "block" && !q;
  const sort: SetSort = order === "block" ? DEFAULT_SORT.key : order;

  const setOpts = {
    filter: q || undefined,
    ...(grouped ? { group: "block" as const } : { sort, ascend }),
    // A block is a main set plus its commander/promo satellites, so grouping
    // has to show all sets — "Main only" filters the satellites out and leaves
    // every block a single set with nothing to nest. The chip's value is kept
    // for when the gallery goes back to a sort.
    baseOnly: grouped ? false : baseOnly,
  };
  const setsQuery = useInfiniteQuery({
    queryKey: setsKey(setOpts),
    queryFn: ({ pageParam }) => fetchSets(pageParam, setOpts),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: scope === "sets",
    // Hold the previous tiles while a new filter/sort loads, so the gallery
    // doesn't blank out on every keystroke.
    placeholderData: keepPreviousData,
  });

  const cardsQuery = useInfiniteQuery({
    queryKey: cardsSearchKey(q, cardMode),
    queryFn: ({ pageParam }) => searchCards(q, pageParam, cardMode),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: scope === "cards" && q.length > 0,
    // Same reason as the gallery: flipping Unique/All printings shouldn't blank
    // the list out from under the keyboard.
    placeholderData: keepPreviousData,
  });

  // Tapping a sort chip that's already active flips its direction, matching
  // the inventory filter row.
  function pickSort(next: (typeof SET_SORTS)[number]) {
    if (order === next.key) setAscend((v) => !v);
    else {
      setOrder(next.key);
      setAscend(next.startAscending);
    }
  }

  // Grouping has no direction of its own; park `ascend` on the sort it falls
  // back to under a search.
  function pickBlocks() {
    setOrder("block");
    setAscend(DEFAULT_SORT.startAscending);
  }

  const controls = (
    <View style={styles.controls}>
      <SegmentedControl
        options={SCOPES}
        value={scope}
        onChange={setScope}
        size="compact"
      />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={
          scope === "sets" ? "Search sets by name" : "Search cards by name"
        }
      />
      {scope === "sets" ? (
        <>
          <View style={styles.sortRow}>
            <Chip
              label="Block"
              active={grouped}
              onPress={pickBlocks}
              size="small"
            />
            {SET_SORTS.map((s) => {
              const active = !grouped && sort === s.key;
              return (
                <Chip
                  key={s.key}
                  label={`${s.label}${active ? (ascend ? " ↑" : " ↓") : ""}`}
                  active={active}
                  onPress={() => pickSort(s)}
                  size="small"
                />
              );
            })}
          </View>
          {grouped ? null : (
            <View style={styles.sortRow}>
              {SET_SCOPES.map((s) => (
                <Chip
                  key={s.label}
                  label={s.label}
                  active={baseOnly === s.value}
                  onPress={() => setBaseOnly(s.value)}
                  size="small"
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.sortRow}>
          {CARD_MODES.map((m) => (
            <Chip
              key={m.value}
              label={m.label}
              active={cardMode === m.value}
              onPress={() => setCardMode(m.value)}
              size="small"
            />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {controls}
      {scope === "cards" ? (
        <CardResults query={cardsQuery} q={q} styles={styles} accent={colors.accent} />
      ) : (
        <SetGallery
          query={setsQuery}
          grouped={grouped}
          styles={styles}
          accent={colors.accent}
        />
      )}
    </View>
  );
}

function SetGallery({
  query,
  grouped,
  styles,
  accent,
}: {
  query: ReturnType<typeof useInfiniteQuery<SetPage>>;
  grouped: boolean;
  styles: ReturnType<typeof createStyles>;
  accent: string;
}) {
  const { isAuthenticated } = useAuth();
  const [peek, setPeek] = useState<ApiSet | null>(null);
  const entries = useMemo<SetEntry[]>(() => {
    const pages = query.data?.pages ?? [];
    const sets = pages.flatMap((p) => p.items);
    if (!grouped) {
      return sets.map((set) => ({ kind: "set", key: set.code, set, inBlock: false }));
    }
    // Each page is a whole run of blocks, so no block straddles a page and the
    // accumulated list regroups cleanly.
    return buildSetEntries(
      sets,
      pages.flatMap((p) => p.multiSetBlockKeys ?? []),
    );
  }, [query.data, grouped]);

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" color={accent} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Something went wrong."}
        onRetry={() => query.refetch()}
      />
    );
  }

  // Every set renders as the full-width hero banner, signed in or out. The
  // signed-in collection summary sits above them (it self-hides with no
  // portfolio).
  const header = (
    <View style={styles.galleryHeader}>
      {isAuthenticated ? <CollectionHero /> : null}
      <Text style={styles.sectionLabel}>SETS</Text>
    </View>
  );

  return (
    <>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.key}
        contentContainerStyle={styles.galleryContent}
        renderItem={({ item }) =>
          item.kind === "header" ? (
            <Text style={styles.blockLabel}>{item.blockName}</Text>
          ) : (
            <View style={item.inBlock ? styles.blockChild : undefined}>
              <SetTile
                set={item.set}
                hero
                onPeek={setPeek}
                onPeekEnd={() => setPeek(null)}
              />
            </View>
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.message}>No sets match your search.</Text>}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
            tintColor={accent}
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={accent} />
          ) : null
        }
      />
      <SetPeekOverlay set={peek} />
    </>
  );
}

function CardResults({
  query,
  q,
  styles,
  accent,
}: {
  query: ReturnType<typeof useInfiniteQuery<Page<ApiCard>>>;
  q: string;
  styles: ReturnType<typeof createStyles>;
  accent: string;
}) {
  const cards = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  // The card query only runs with a term, so an empty box is a prompt, not a
  // "no results" state.
  if (!q) {
    return <Text style={styles.message}>Type a card name to search every set.</Text>;
  }
  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" color={accent} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Something went wrong."}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <FlatList
      data={cards}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CardListItem card={item} />}
      ListEmptyComponent={<Text style={styles.message}>No cards found.</Text>}
      onEndReached={() => query.hasNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          tintColor={accent}
        />
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} color={accent} />
        ) : null
      }
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    controls: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 8 },
    sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    center: { marginTop: 40 },
    footer: { marginVertical: 16 },
    message: { textAlign: "center", marginTop: 40, color: colors.textMuted },
    galleryContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
    galleryHeader: { gap: 12, marginBottom: 12, marginTop: 4 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginTop: 4,
    },
    blockLabel: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: colors.textPrimary,
      marginTop: 8,
    },
    // The rail plus the inset are what make a block's sets read as belonging to
    // the header above them, rather than merely following it.
    blockChild: {
      marginLeft: BLOCK_INDENT,
      paddingLeft: BLOCK_INDENT,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
    },
  });
