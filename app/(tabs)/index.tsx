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
  type Page,
  type SetSort,
} from "../../lib/api/catalog";
import { nextPage } from "../../lib/pagination";
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
 * Set orderings, each with the direction it should start in. Release date
 * defaults to newest-first (the gallery's long-standing order); name to A–Z.
 */
const SET_SORTS: { key: SetSort; label: string; startAscending: boolean }[] = [
  { key: "set.releaseDate", label: "Release", startAscending: false },
  { key: "set.name", label: "Name", startAscending: true },
];

export default function BrowseScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [scope, setScope] = useState<Scope>("sets");
  const [query, setQuery] = useState("");
  const q = useDebounce(query.trim(), 350);

  const [sort, setSort] = useState<SetSort>("set.releaseDate");
  const [ascend, setAscend] = useState(false);

  const setOpts = { filter: q || undefined, sort, ascend };
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
    queryKey: cardsSearchKey(q),
    queryFn: ({ pageParam }) => searchCards(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: scope === "cards" && q.length > 0,
  });

  // Tapping a sort chip that's already active flips its direction, matching
  // the inventory filter row.
  function pickSort(next: (typeof SET_SORTS)[number]) {
    if (sort === next.key) setAscend((v) => !v);
    else {
      setSort(next.key);
      setAscend(next.startAscending);
    }
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
        <View style={styles.sortRow}>
          {SET_SORTS.map((s) => {
            const active = sort === s.key;
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
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {controls}
      {scope === "cards" ? (
        <CardResults query={cardsQuery} q={q} styles={styles} accent={colors.accent} />
      ) : (
        <SetGallery query={setsQuery} styles={styles} accent={colors.accent} />
      )}
    </View>
  );
}

function SetGallery({
  query,
  styles,
  accent,
}: {
  query: ReturnType<typeof useInfiniteQuery<Page<ApiSet>>>;
  styles: ReturnType<typeof createStyles>;
  accent: string;
}) {
  const { isAuthenticated } = useAuth();
  const [peek, setPeek] = useState<ApiSet | null>(null);
  const sets = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

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
        data={sets}
        keyExtractor={(s) => s.code}
        contentContainerStyle={styles.galleryContent}
        renderItem={({ item }) => (
          <SetTile
            set={item}
            hero
            onPeek={setPeek}
            onPeekEnd={() => setPeek(null)}
          />
        )}
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
  });
