import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  setsKey,
  cardsSearchKey,
  fetchSets,
  searchCards,
  type Page,
} from "../../lib/api/catalog";
import { nextPage } from "../../lib/pagination";
import {
  PORTFOLIO_SUMMARY_KEY,
  fetchPortfolioSummary,
} from "../../lib/api/portfolio";
import type { ApiCard, ApiSet } from "../../lib/api/types";
import { CardListItem } from "../../components/CardListItem";
import { CollectionHero } from "../../components/CollectionHero";
import { ErrorState } from "../../components/ErrorState";
import { SetTile } from "../../components/SetTile";
import { useAuth } from "../../lib/auth/AuthContext";
import { useSettings } from "../../lib/settings/SettingsContext";
import { useDebounce } from "../../lib/useDebounce";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

export default function BrowseScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { pageSize } = useSettings();
  const [query, setQuery] = useState("");
  const q = useDebounce(query.trim(), 350);
  const searching = q.length > 0;

  const setsQuery = useInfiniteQuery({
    queryKey: setsKey(pageSize),
    queryFn: ({ pageParam }) => fetchSets(pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: !searching,
  });

  const cardsQuery = useInfiniteQuery({
    queryKey: cardsSearchKey(q),
    queryFn: ({ pageParam }) => searchCards(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: searching,
  });

  const active = searching ? cardsQuery : setsQuery;

  return (
    <View style={[styles.container, { paddingTop: 8 }]}>
      <TextInput
        style={styles.search}
        placeholder="Search cards by name"
        placeholderTextColor={colors.placeholder}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      {active.isPending ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      ) : active.isError ? (
        <ErrorState
          message={
            active.error instanceof Error ? active.error.message : "Something went wrong."
          }
          onRetry={() => active.refetch()}
        />
      ) : searching ? (
        <CardResults query={cardsQuery} styles={styles} accent={colors.accent} />
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
  const sets = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  // Signed in with a portfolio, the hero slot shows your collection stats and
  // every set stays in the grid. Signed out — or before a portfolio exists
  // (the summary resolves null) — the newest set is the full-width hero.
  const summary = useQuery({
    queryKey: PORTFOLIO_SUMMARY_KEY,
    queryFn: fetchPortfolioSummary,
    enabled: isAuthenticated,
  });
  const featured =
    !isAuthenticated || (summary.isSuccess && summary.data == null)
      ? sets[0]
      : undefined;
  const gridSets = featured ? sets.slice(1) : sets;

  const header = (
    <View style={styles.galleryHeader}>
      {isAuthenticated && !featured ? <CollectionHero /> : null}
      {featured ? <SetTile set={featured} hero /> : null}
      <Text style={styles.sectionLabel}>SETS</Text>
    </View>
  );

  return (
    <FlatList
      data={gridSets}
      keyExtractor={(s) => s.code}
      numColumns={2}
      columnWrapperStyle={styles.galleryRow}
      contentContainerStyle={styles.galleryContent}
      renderItem={({ item }) => <SetTile set={item} />}
      ListHeaderComponent={header}
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

function CardResults({
  query,
  styles,
  accent,
}: {
  query: ReturnType<typeof useInfiniteQuery<Page<ApiCard>>>;
  styles: ReturnType<typeof createStyles>;
  accent: string;
}) {
  const cards = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
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
    search: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    center: { marginTop: 40 },
    footer: { marginVertical: 16 },
    message: { textAlign: "center", marginTop: 40, color: colors.textMuted },
    galleryContent: { paddingHorizontal: 16, paddingBottom: 24 },
    galleryHeader: { gap: 12, marginBottom: 12, marginTop: 4 },
    galleryRow: { gap: 12, marginBottom: 12 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
