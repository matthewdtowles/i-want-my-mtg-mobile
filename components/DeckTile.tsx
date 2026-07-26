import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiDeckSummary } from "../lib/api/types";
import { formatDeckFormat, formatPrice } from "../lib/format";
import { SCRYFALL_USER_AGENT } from "../lib/images";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

/**
 * Cover fields the API adds to a deck summary. Declared here rather than read
 * off `ApiDeckSummary` because `lib/api/schema.ts` is generated from the
 * *deployed* spec — they type as optional until the backend ships and
 * `npm run gen:api` picks them up, at which point this can be dropped for the
 * generated shape. Optional either way, so a response without them renders the
 * art-less tile, which is also the empty-deck case.
 */
type DeckCover = { coverImgSrc?: string; coverCardName?: string };

/**
 * A deck in the list: the art crop of its representative card as a banner with
 * the deck name over a scrim, and the deck's stats on the surface below.
 *
 * Same art-forward treatment as `SetTile`, but banded rather than full-bleed —
 * a deck carries format, size, and value that a set tile does not, and stacking
 * that over artwork reads worse than giving it its own room.
 */
export function DeckTile({
  deck,
  onPress,
}: {
  deck: ApiDeckSummary & DeckCover;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const uri = deck.coverImgSrc;

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={deck.name}
    >
      <View style={styles.art}>
        {uri ? (
          <Image
            source={{ uri, headers: { "User-Agent": SCRYFALL_USER_AGENT } }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            accessibilityLabel={
              deck.coverCardName ? `Art from ${deck.coverCardName}` : undefined
            }
          />
        ) : null}
        <View style={styles.scrim}>
          <Text style={styles.name} numberOfLines={2}>
            {deck.name}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.format}>{formatDeckFormat(deck.format).toUpperCase()}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.meta}>
            {deck.cardCount} card{deck.cardCount === 1 ? "" : "s"}
          </Text>
          <Text style={styles.value}>{formatPrice(deck.estimatedValue)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tile: {
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pressed: { opacity: 0.85 },
    art: {
      height: 104,
      backgroundColor: colors.surfaceAlt,
      justifyContent: "flex-end",
    },
    scrim: {
      paddingHorizontal: 12,
      paddingTop: 24,
      paddingBottom: 8,
      backgroundColor: "rgba(10,10,14,0.62)",
    },
    name: { fontSize: 17, fontWeight: "800", color: "#ffffff" },
    body: { paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
    format: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
      color: colors.accent,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    meta: { fontSize: 13, color: colors.textSecondary },
    value: { fontSize: 14, fontWeight: "700", color: colors.success },
  });
