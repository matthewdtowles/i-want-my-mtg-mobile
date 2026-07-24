import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  DECKS_KEY,
  deckKey,
  deckMissingToBuyList,
  deleteDeck,
  fetchDeck,
  setDeckCardQuantity,
} from "../../lib/api/decks";
import { deckOwnedKey, fetchQuantities } from "../../lib/api/inventory";
import { BUY_LIST_KEY } from "../../lib/api/buyList";
import type { ApiDeckCard, ApiDeckDetail } from "../../lib/api/types";
import { ErrorState } from "../../components/ErrorState";
import { QuantityStepper } from "../../components/QuantityStepper";
import { SearchField } from "../../components/SearchField";
import { formatDeckFormat, formatPrice } from "../../lib/format";
import { useDebounce } from "../../lib/useDebounce";
import { useOptimisticMutation } from "../../lib/useOptimisticMutation";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

function sameCard(a: ApiDeckCard, c: { cardId: string; isSideboard: boolean }): boolean {
  return a.cardId === c.cardId && a.isSideboard === c.isSideboard;
}

// Absolute-quantity upsert mirrored client-side: update the matching card,
// drop it at 0, and keep cardCount in sync so the header doesn't lag.
function applyQuantity(
  deck: ApiDeckDetail | undefined,
  target: { cardId: string; isSideboard: boolean },
  quantity: number,
): ApiDeckDetail | undefined {
  if (!deck) return deck;
  const cards =
    quantity <= 0
      ? deck.cards.filter((c) => !sameCard(c, target))
      : deck.cards.map((c) => (sameCard(c, target) ? { ...c, quantity } : c));
  const cardCount = cards.reduce((sum, c) => sum + c.quantity, 0);
  return { ...deck, cards, cardCount };
}

export default function DeckDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);

  const [missingOnly, setMissingOnly] = useState(false);
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim().toLowerCase(), 250);

  const query = useQuery({
    queryKey: deckKey(id),
    queryFn: () => fetchDeck(id),
    enabled: Number.isFinite(id),
  });

  const cardIds = useMemo(
    () => [...new Set((query.data?.cards ?? []).map((c) => c.cardId))],
    [query.data],
  );

  // Owned quantities power the "missing" view (deck qty vs. inventory).
  const owned = useQuery({
    queryKey: deckOwnedKey(id, cardIds),
    queryFn: () => fetchQuantities(cardIds),
    enabled: cardIds.length > 0,
  });

  const ownedById = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of owned.data ?? []) map.set(q.cardId, q.normalQuantity + q.foilQuantity);
    return map;
  }, [owned.data]);

  const KEY = deckKey(id);

  const setQty = useOptimisticMutation<
    ApiDeckDetail,
    { cardId: string; isSideboard: boolean; quantity: number }
  >({
    queryKey: KEY,
    mutationFn: ({ cardId, isSideboard, quantity }) =>
      setDeckCardQuantity(id, cardId, isSideboard, quantity),
    apply: (old, vars) => applyQuantity(old, vars, vars.quantity),
    errorTitle: "Couldn't update quantity",
    invalidates: [KEY, DECKS_KEY],
  });

  const missingToBuyList = useMutation({
    mutationFn: () => deckMissingToBuyList(id),
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: BUY_LIST_KEY });
      Alert.alert(
        "Added to buy-list",
        added === 0
          ? "You already own every card in this deck."
          : `Added ${added} card${added === 1 ? "" : "s"} to your buy-list.`,
      );
    },
    onError: (e) =>
      Alert.alert("Couldn't add", e instanceof Error ? e.message : "Please try again."),
  });

  const remove = useMutation({
    mutationFn: () => deleteDeck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DECKS_KEY });
      router.back();
    },
    onError: (e) =>
      Alert.alert("Couldn't delete deck", e instanceof Error ? e.message : "Please try again."),
  });

  function confirmDelete(name: string) {
    Alert.alert("Delete deck", `Delete “${name}”? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
    ]);
  }

  function openCard(card: ApiDeckCard) {
    if (card.setCode && card.cardNumber) {
      router.push({
        pathname: "/card/[setCode]/[number]",
        params: { setCode: card.setCode, number: card.cardNumber },
      });
    }
  }

  function missingCount(card: ApiDeckCard): number {
    return Math.max(0, card.quantity - (ownedById.get(card.cardId) ?? 0));
  }

  const deck = query.data;

  const sections = useMemo(() => {
    if (!deck) return [];
    let visible = missingOnly
      ? deck.cards.filter((c) => c.quantity - (ownedById.get(c.cardId) ?? 0) > 0)
      : deck.cards;
    // The whole deck is already loaded, so search filters client-side.
    if (q) {
      visible = visible.filter((c) =>
        (c.cardName ?? c.cardId).toLowerCase().includes(q),
      );
    }
    const main = visible.filter((c) => !c.isSideboard);
    const side = visible.filter((c) => c.isSideboard);
    return [
      { title: "Main", data: main },
      { title: "Sideboard", data: side },
    ].filter((s) => s.data.length > 0);
  }, [deck, missingOnly, ownedById, q]);

  const headerScreen = (
    <Stack.Screen
      options={{
        title: deck?.name ?? "Deck",
        headerBackTitle: "Back",
        headerRight: () =>
          deck ? (
            <Pressable
              hitSlop={8}
              onPress={() =>
                // Only the id travels; the edit screen reads the deck from the
                // query cache (with a fetch fallback).
                router.push({ pathname: "/deck/new", params: { id: String(deck.id) } })
              }
              style={styles.editBtn}
              accessibilityLabel="Edit deck"
            >
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (query.isPending) {
    return (
      <>
        {headerScreen}
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      </>
    );
  }
  if (query.isError || !deck) {
    return (
      <>
        {headerScreen}
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Failed to load deck."}
          onRetry={() => query.refetch()}
        />
      </>
    );
  }

  return (
    <>
      {headerScreen}
      <SectionList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={sections}
        keyExtractor={(c) => `${c.cardId}-${c.isSideboard}`}
        ListHeaderComponent={
          <View style={styles.summaryWrap}>
            <Text style={styles.summary}>
              {[
                formatDeckFormat(deck.format),
                `${deck.cardCount} card${deck.cardCount === 1 ? "" : "s"}`,
                formatPrice(deck.estimatedValue),
              ].join(" · ")}
            </Text>
            {deck.illegalCount > 0 ? (
              <Text style={styles.illegal}>
                {deck.illegalCount} card{deck.illegalCount === 1 ? "" : "s"} not legal in{" "}
                {deck.format}
              </Text>
            ) : null}
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search this deck"
            />
            <Pressable
              style={[styles.toggle, missingOnly && styles.toggleActive]}
              onPress={() => setMissingOnly((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ selected: missingOnly }}
            >
              <Text style={[styles.toggleText, missingOnly && styles.toggleTextActive]}>
                {missingOnly ? "Showing missing cards" : "Show missing cards only"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({
                  pathname: "/deck/add",
                  params: { deckId: String(deck.id), name: deck.name },
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>+ Add cards</Text>
            </Pressable>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const need = missingCount(item);
          return (
            <View style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => openCard(item)} disabled={!(item.setCode && item.cardNumber)}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.cardName ?? item.cardId}
                </Text>
                <Text style={styles.cardMeta}>
                  {[
                    item.setCode && item.cardNumber
                      ? `${item.setCode.toUpperCase()} #${item.cardNumber}`
                      : null,
                    need > 0 ? `need ${need}` : null,
                    item.legalInFormat === false ? "not legal" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Pressable>
              <QuantityStepper
                quantity={item.quantity}
                size={34}
                subject={`${item.cardName ?? "card"} quantity`}
                onDecrement={() =>
                  setQty.mutate({
                    cardId: item.cardId,
                    isSideboard: item.isSideboard,
                    quantity: item.quantity - 1,
                  })
                }
                onIncrement={() =>
                  setQty.mutate({
                    cardId: item.cardId,
                    isSideboard: item.isSideboard,
                    quantity: item.quantity + 1,
                  })
                }
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyHint}>
            {q
              ? "No cards match your search."
              : missingOnly
                ? "You own every card in this deck."
                : "This deck has no cards yet."}
          </Text>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => missingToBuyList.mutate()}
              disabled={missingToBuyList.isPending}
              accessibilityRole="button"
            >
              <Text style={styles.actionText}>
                {missingToBuyList.isPending ? "Adding…" : "Add missing cards to buy-list"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => confirmDelete(deck.name)}
              disabled={remove.isPending}
              accessibilityRole="button"
            >
              <Text style={styles.deleteText}>
                {remove.isPending ? "Deleting…" : "Delete deck"}
              </Text>
            </Pressable>
          </View>
        }
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, paddingBottom: 32 },
    center: { marginTop: 40 },
    editBtn: { paddingHorizontal: 12 },
    editText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
    summaryWrap: { gap: 8, marginBottom: 12 },
    summary: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },
    illegal: { fontSize: 13, color: colors.danger },
    toggle: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    toggleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    toggleText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
    toggleTextActive: { color: colors.onAccent },
    sectionHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingVertical: 12,
    },
    rowMain: { flex: 1, gap: 2, paddingRight: 12 },
    cardName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    cardMeta: { fontSize: 13, color: colors.textSecondary },
    emptyHint: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 24 },
    footer: { gap: 12, marginTop: 24 },
    actionBtn: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    actionText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
    deleteBtn: { paddingVertical: 10, alignItems: "center" },
    deleteText: { color: colors.danger, fontSize: 15, fontWeight: "600" },
  });
