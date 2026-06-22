import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text } from "react-native";

import { fetchSetCards, type Page } from "../../lib/api/catalog";
import type { ApiCard } from "../../lib/api/types";
import { CardListItem } from "../../components/CardListItem";

function nextPage(last: Page<ApiCard>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

export default function SetDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();

  const query = useInfiniteQuery({
    queryKey: ["set", code, "cards"],
    queryFn: ({ pageParam }) => fetchSetCards(code, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  const cards = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return (
    <>
      <Stack.Screen options={{ title: code.toUpperCase() }} />
      {query.isPending ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : query.isError ? (
        <Text style={styles.message}>
          {query.error instanceof Error ? query.error.message : "Failed to load."}
        </Text>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CardListItem card={item} />}
          onEndReached={() => query.hasNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: 40 },
  footer: { marginVertical: 16 },
  message: { textAlign: "center", marginTop: 40, color: "#6b7280" },
});
