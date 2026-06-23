import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchSets, searchCards, type Page } from "../../lib/api/catalog";
import type { ApiCard, ApiSet } from "../../lib/api/types";
import { CardListItem } from "../../components/CardListItem";
import { useDebounce } from "../../lib/useDebounce";

function nextPage<T>(last: Page<T>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const q = useDebounce(query.trim(), 350);
  const searching = q.length > 0;

  const setsQuery = useInfiniteQuery({
    queryKey: ["sets"],
    queryFn: ({ pageParam }) => fetchSets(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: !searching,
  });

  const cardsQuery = useInfiniteQuery({
    queryKey: ["cards", "search", q],
    queryFn: ({ pageParam }) => searchCards(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: searching,
  });

  const active = searching ? cardsQuery : setsQuery;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <TextInput
        style={styles.search}
        placeholder="Search cards by name"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      {active.isPending ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : active.isError ? (
        <Text style={styles.message}>
          {active.error instanceof Error ? active.error.message : "Something went wrong."}
        </Text>
      ) : searching ? (
        <CardResults query={cardsQuery} />
      ) : (
        <SetResults query={setsQuery} />
      )}
    </View>
  );
}

function SetResults({
  query,
}: {
  query: ReturnType<typeof useInfiniteQuery<Page<ApiSet>>>;
}) {
  const sets = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  return (
    <FlatList
      data={sets}
      keyExtractor={(s) => s.code}
      renderItem={({ item }) => <SetRow set={item} />}
      onEndReached={() => query.hasNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
    />
  );
}

function CardResults({
  query,
}: {
  query: ReturnType<typeof useInfiniteQuery<Page<ApiCard>>>;
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
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
    />
  );
}

function SetRow({ set }: { set: ApiSet }) {
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  center: { marginTop: 40 },
  footer: { marginVertical: 16 },
  message: { textAlign: "center", marginTop: 40, color: "#6b7280" },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  setName: { fontSize: 16, fontWeight: "600" },
  setSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  chevron: { fontSize: 22, color: "#9ca3af", marginLeft: 8 },
});
