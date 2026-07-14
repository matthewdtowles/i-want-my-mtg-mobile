import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  View,
} from "react-native";

import { setCardsKey, fetchSetCards, type Page } from "../../lib/api/catalog";
import { INVENTORY_KEY } from "../../lib/api/inventory";
import { bulkAddToInventory } from "../../lib/api/inventory";
import type { ApiCard } from "../../lib/api/types";
import { CardListItem } from "../../components/CardListItem";
import { ErrorState } from "../../components/ErrorState";
import { BulkAddBar } from "../../components/BulkAddBar";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

function nextPage(last: Page<ApiCard>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

export default function SetDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ code: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  // Multi-select state: cardId -> card, so we know each card's finish support.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, ApiCard>>({});
  const selectedCards = Object.values(selected);

  const query = useInfiniteQuery({
    queryKey: setCardsKey(code),
    queryFn: ({ pageParam }) => fetchSetCards(code as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: !!code,
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

  const headerButton = code
    ? () => (
        <Pressable
          onPress={() => (selectMode ? exitSelect() : setSelectMode(true))}
          hitSlop={12}
          style={styles.headerBtn}
          accessibilityRole="button"
        >
          <Text style={styles.headerBtnText}>{selectMode ? "Done" : "Select"}</Text>
        </Pressable>
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

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: code.toUpperCase(), headerRight: headerButton }}
      />
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

      {selectMode ? (
        <BulkAddBar
          count={selectedCards.length}
          submitting={addMut.isPending}
          onAdd={onAdd}
          onCancel={exitSelect}
        />
      ) : null}
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
    headerBtn: { paddingHorizontal: 16 },
    headerBtnText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  });
