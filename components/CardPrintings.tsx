import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { cardPrintingsKey, fetchCardPrintings } from "../lib/api/catalog";
import { nextPage } from "../lib/pagination";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardListItem } from "./CardListItem";
import { CardPanel } from "./CardPanel";
import { ErrorState } from "./ErrorState";

type Props = {
  /** The printing being viewed — the one row this list leaves out. */
  cardId: string;
  setCode: string;
  number: string;
};

/**
 * The other sets this card was printed in, most valuable first. The API returns
 * every printing including the one on screen, so the current card is filtered
 * out of the rows and discounted from the total.
 */
export function CardPrintings({ cardId, setCode, number }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const query = useInfiniteQuery({
    queryKey: cardPrintingsKey(setCode, number),
    queryFn: ({ pageParam }) => fetchCardPrintings(setCode, number, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  const others = useMemo(
    () =>
      (query.data?.pages ?? [])
        .flatMap((p) => p.items)
        .filter((c) => c.id !== cardId),
    [query.data, cardId],
  );

  // `total` counts every printing, so one of them is the card on screen.
  const otherCount = Math.max((query.data?.pages[0]?.meta?.total ?? 1) - 1, 0);

  // Most cards have a single printing, so the section is usually about to
  // resolve to nothing — showing a spinning panel first would make the common
  // case flash a heading that then disappears.
  if (query.isPending) return null;

  if (query.isError) {
    return (
      <CardPanel title="Other printings">
        <View style={styles.state}>
          <ErrorState
            variant="inline"
            message="Couldn’t load other printings."
            onRetry={() => query.refetch()}
          />
        </View>
      </CardPanel>
    );
  }

  // A card printed exactly once has nothing to show, and a section saying so on
  // every such card is noise — drop it entirely.
  if (otherCount === 0) return null;

  return (
    <CardPanel
      title="Other printings"
      headerRight={<Text style={styles.count}>{otherCount}</Text>}
    >
      {/* Negative inset: the rows carry the list padding the panel already has. */}
      <View style={styles.rows}>
        {others.map((card) => (
          <CardListItem key={card.id} card={card} />
        ))}
      </View>

      {query.hasNextPage ? (
        <Pressable
          style={styles.more}
          onPress={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          accessibilityRole="button"
          accessibilityLabel="Show more printings"
        >
          {query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.moreText}>Show more</Text>
          )}
        </Pressable>
      ) : null}
    </CardPanel>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    state: { marginTop: 8 },
    count: { fontSize: 15, fontWeight: "700", color: colors.textMuted },
    rows: { marginHorizontal: -16 },
    more: {
      marginTop: 8,
      paddingVertical: 10,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    moreText: { fontSize: 14, fontWeight: "600", color: colors.accent },
  });
