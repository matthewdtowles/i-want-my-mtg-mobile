import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
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
  SETS_KEY,
  cardsSearchKey,
  fetchSets,
  searchCards,
  type Page,
} from "../../lib/api/catalog";
import { nextPage } from "../../lib/pagination";
import type { ApiCard, ApiSet } from "../../lib/api/types";
import { CardListItem } from "../../components/CardListItem";
import { ErrorState } from "../../components/ErrorState";
import { useDebounce } from "../../lib/useDebounce";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

export default function BrowseScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState("");
  const q = useDebounce(query.trim(), 350);
  const searching = q.length > 0;

  const setsQuery = useInfiniteQuery({
    queryKey: SETS_KEY,
    queryFn: ({ pageParam }) => fetchSets(pageParam),
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
        <SetResults query={setsQuery} styles={styles} accent={colors.accent} />
      )}
    </View>
  );
}

function SetResults({
  query,
  styles,
  accent,
}: {
  query: ReturnType<typeof useInfiniteQuery<Page<ApiSet>>>;
  styles: ReturnType<typeof createStyles>;
  accent: string;
}) {
  const sets = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  return (
    <FlatList
      data={sets}
      keyExtractor={(s) => s.code}
      renderItem={({ item }) => <SetRow set={item} styles={styles} />}
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
  if (cards.length === 0) {
    return <Text style={styles.message}>No cards found.</Text>;
  }
  return (
    <FlatList
      data={cards}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CardListItem card={item} />}
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

function SetRow({
  set,
  styles,
}: {
  set: ApiSet;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Link href={{ pathname: "/set/[code]", params: { code: set.code } }} asChild>
      <Pressable style={styles.setRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.setName} numberOfLines={1}>
            {set.name}
          </Text>
          <Text style={styles.setSub}>
            {set.code.toUpperCase()}
            {set.releaseDate ? ` · ${set.releaseDate.slice(0, 4)}` : ""}
            {set.baseSize != null ? ` · ${set.baseSize} cards` : ""}
          </Text>
        </View>
        <Text style={styles.chevron}>{"›"}</Text>
      </Pressable>
    </Link>
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
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    setName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
    setSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    chevron: { fontSize: 22, color: colors.chevron, marginLeft: 8 },
  });
