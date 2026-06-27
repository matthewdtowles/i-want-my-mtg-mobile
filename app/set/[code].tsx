import { useInfiniteQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text } from "react-native";

import { fetchSetCards, type Page } from "../../lib/api/catalog";
import type { ApiCard } from "../../lib/api/types";
import { CardListItem } from "../../components/CardListItem";
import { ErrorState } from "../../components/ErrorState";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

function nextPage(last: Page<ApiCard>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

export default function SetDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ code: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  const query = useInfiniteQuery({
    queryKey: ["set", code, "cards"],
    queryFn: ({ pageParam }) => fetchSetCards(code as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: !!code,
  });

  const cards = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  if (!code) {
    return (
      <>
        <Stack.Screen options={{ title: "Set" }} />
        <Text style={styles.message}>Set not found.</Text>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: code.toUpperCase() }} />
      {query.isPending ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      ) : query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Failed to load."}
          onRetry={() => query.refetch()}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CardListItem card={item} />}
          onEndReached={() => query.hasNextPage && query.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => query.refetch()}
              tintColor={colors.accent}
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.accent} />
            ) : null
          }
        />
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { backgroundColor: colors.background },
    center: { marginTop: 40 },
    footer: { marginVertical: 16 },
    message: {
      textAlign: "center",
      marginTop: 40,
      color: colors.textMuted,
    },
  });
