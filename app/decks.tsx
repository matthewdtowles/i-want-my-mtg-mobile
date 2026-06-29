import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DECKS_KEY, fetchDecks } from "../lib/api/decks";
import type { ApiDeckSummary } from "../lib/api/types";
import { ErrorState } from "../components/ErrorState";
import { formatPrice } from "../lib/format";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

export default function DecksScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const query = useQuery({ queryKey: DECKS_KEY, queryFn: fetchDecks });

  const header = (
    <Stack.Screen
      options={{
        title: "Decks",
        headerBackTitle: "Back",
        headerRight: () => (
          <Pressable
            hitSlop={8}
            onPress={() => router.push("/deck/new")}
            style={styles.addBtn}
            accessibilityLabel="New deck"
          >
            <Ionicons name="add" size={26} color={colors.accent} />
          </Pressable>
        ),
      }}
    />
  );

  if (query.isPending) {
    return (
      <>
        {header}
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        {header}
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Failed to load decks."}
          onRetry={() => query.refetch()}
        />
      </>
    );
  }
  if (query.data.length === 0) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <Text style={styles.empty}>No decks yet.</Text>
          <Text style={styles.emptyHint}>
            Tap + to create a deck or import a decklist.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      {header}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={query.data}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => <DeckRow item={item} styles={styles} onPress={() => router.push(`/deck/${item.id}`)} />}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.accent}
          />
        }
      />
    </>
  );
}

function DeckRow({
  item,
  styles,
  onPress,
}: {
  item: ApiDeckSummary;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {[
            item.format ? item.format[0].toUpperCase() + item.format.slice(1) : "No format",
            `${item.cardCount} card${item.cardCount === 1 ? "" : "s"}`,
            formatPrice(item.estimatedValue),
          ].join(" · ")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={styles.chevron.color} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, gap: 12 },
    addBtn: { paddingHorizontal: 12 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 16,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    rowMain: { flex: 1, gap: 2 },
    name: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    meta: { fontSize: 13, color: colors.textSecondary },
    chevron: { color: colors.textMuted },
  });
