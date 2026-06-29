import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { searchCards, type Page } from "../../lib/api/catalog";
import { DECKS_KEY, addDeckCard, deckKey } from "../../lib/api/decks";
import type { ApiCard } from "../../lib/api/types";
import { CardThumb } from "../../components/CardThumb";
import { ErrorState } from "../../components/ErrorState";
import { formatPrice } from "../../lib/format";
import { useDebounce } from "../../lib/useDebounce";
import { useTheme } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

function nextPage(last: Page<ApiCard>): number | undefined {
  const m = last.meta;
  return m && m.page < m.totalPages ? m.page + 1 : undefined;
}

type Board = "main" | "side";

export default function AddDeckCardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ deckId: string; name?: string }>();
  const deckId = Number(Array.isArray(params.deckId) ? params.deckId[0] : params.deckId);

  const [text, setText] = useState("");
  const [board, setBoard] = useState<Board>("main");
  // Keyed by `${board}:${cardId}` so the "Added ×N" feedback is board-specific.
  const [addedCounts, setAddedCounts] = useState<Record<string, number>>({});
  const q = useDebounce(text.trim(), 350);
  const searching = q.length > 0;

  const search = useInfiniteQuery({
    queryKey: ["cards", "search", q],
    queryFn: ({ pageParam }) => searchCards(q, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: searching,
  });

  const add = useMutation({
    mutationFn: ({ card, isSideboard }: { card: ApiCard; isSideboard: boolean }) =>
      addDeckCard(deckId, card.id, isSideboard, 1),
    onMutate({ card, isSideboard }) {
      // Optimistic feedback so rapid taps feel instant.
      const k = `${isSideboard ? "side" : "main"}:${card.id}`;
      setAddedCounts((c) => ({ ...c, [k]: (c[k] ?? 0) + 1 }));
    },
    onError(e, { card, isSideboard }) {
      const k = `${isSideboard ? "side" : "main"}:${card.id}`;
      setAddedCounts((c) => ({ ...c, [k]: Math.max(0, (c[k] ?? 1) - 1) }));
      Alert.alert("Couldn't add card", e instanceof Error ? e.message : "Please try again.");
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: deckKey(deckId) });
      queryClient.invalidateQueries({ queryKey: DECKS_KEY });
    },
  });

  const cards = useMemo(
    () => search.data?.pages.flatMap((p) => p.items) ?? [],
    [search.data],
  );

  if (!Number.isFinite(deckId)) {
    return (
      <>
        <Stack.Screen options={{ title: "Add cards" }} />
        <Text style={styles.message}>Deck not found.</Text>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: params.name ? `Add to ${params.name}` : "Add cards" }} />

      <View style={styles.segment}>
        {(["main", "side"] as Board[]).map((b) => {
          const active = board === b;
          return (
            <Pressable
              key={b}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setBoard(b)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {b === "main" ? "Main deck" : "Sideboard"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search cards by name"
        placeholderTextColor={colors.placeholder}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      {!searching ? (
        <Text style={styles.message}>Search for a card to add it to this deck.</Text>
      ) : search.isPending ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      ) : search.isError ? (
        <ErrorState
          message={search.error instanceof Error ? search.error.message : "Search failed."}
          onRetry={() => search.refetch()}
        />
      ) : cards.length === 0 ? (
        <Text style={styles.message}>No cards found.</Text>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <CardThumb imgSrc={item.imgSrc} size="small" width={44} />
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.setName ?? item.setCode.toUpperCase()} #{item.number}
                </Text>
              </View>
              <Text style={styles.price}>{formatPrice(item.prices?.normal)}</Text>
              <Pressable
                style={styles.addBtn}
                onPress={() => add.mutate({ card: item, isSideboard: board === "side" })}
                accessibilityLabel={`Add ${item.name} to ${board === "side" ? "sideboard" : "main deck"}`}
              >
                <Text style={styles.addText}>
                  {addedCounts[`${board}:${item.id}`]
                    ? `Added ×${addedCounts[`${board}:${item.id}`]}`
                    : "Add"}
                </Text>
              </Pressable>
            </View>
          )}
          onEndReached={() => search.hasNextPage && search.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            search.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.accent} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
    segment: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      overflow: "hidden",
    },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: colors.surface },
    segmentBtnActive: { backgroundColor: colors.accent },
    segmentText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    segmentTextActive: { color: colors.onAccent },
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
    message: { textAlign: "center", marginTop: 40, color: colors.textMuted, paddingHorizontal: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    body: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    price: { fontSize: 14, fontWeight: "600", color: colors.success },
    addBtn: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 64,
      alignItems: "center",
    },
    addText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  });
