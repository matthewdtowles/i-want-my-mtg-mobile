import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DECKS_KEY, fetchDecks } from "../../lib/api/decks";
import { DeckTile } from "../../components/DeckTile";
import { ErrorState } from "../../components/ErrorState";
import { SignInPrompt } from "../../components/SignInPrompt";
import { useAuth } from "../../lib/auth/AuthContext";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

export default function DecksScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <SignInPrompt
        title="Build and price decks"
        message="Sign in to create decks, import decklists, and see what each deck is worth."
      />
    );
  }
  return <DecksList />;
}

function DecksList() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const query = useQuery({ queryKey: DECKS_KEY, queryFn: fetchDecks });

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Failed to load decks."}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (query.data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No decks yet.</Text>
        <Text style={styles.emptyHint}>Tap + to create a deck or import a decklist.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={query.data}
      keyExtractor={(it) => String(it.id)}
      renderItem={({ item }) => (
        <DeckTile deck={item} onPress={() => router.push(`/deck/${item.id}`)} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          tintColor={colors.accent}
        />
      }
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 16, gap: 12 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    empty: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
    emptyHint: { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: "center" },
  });
