import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiSet } from "../lib/api/types";
import { cardImageUrl, SCRYFALL_USER_AGENT } from "../lib/images";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { SetSymbol } from "./SetSymbol";

/**
 * A gallery tile for one set: the set's cover art (its first card's art crop)
 * as the background, with the expansion symbol and name over a bottom scrim.
 * `hero` renders the larger banner variant. Tap opens the set; press-and-hold
 * peeks its stats, which the parent renders via onPeek/onPeekEnd (same
 * contract as CardGridCell).
 */
export function SetTile({
  set,
  hero = false,
  onPeek,
  onPeekEnd,
}: {
  set: ApiSet;
  hero?: boolean;
  onPeek?: (set: ApiSet) => void;
  onPeekEnd?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const peeking = useRef(false);

  // `coverImgSrc` is an image tail, like a card's `imgSrc` — the list response
  // carries it so a page of tiles costs one request instead of one per tile.
  const uri = cardImageUrl(set.coverImgSrc, "art_crop");

  const year = set.releaseDate ? set.releaseDate.slice(0, 4) : null;
  const sub = [year, set.baseSize != null ? `${set.baseSize} cards` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={({ pressed }) => [
        hero ? styles.heroTile : styles.tile,
        pressed && styles.pressed,
      ]}
      // A long-press (peek) cancels onPress, so releasing a peek never navigates.
      onPress={() =>
        router.push({ pathname: "/set/[code]", params: { code: set.code } })
      }
      onLongPress={
        onPeek
          ? () => {
              peeking.current = true;
              onPeek(set);
            }
          : undefined
      }
      onPressOut={() => {
        if (peeking.current) {
          peeking.current = false;
          onPeekEnd?.();
        }
      }}
      delayLongPress={220}
      accessibilityRole="button"
      accessibilityLabel={set.name}
      accessibilityHint={
        onPeek ? "Tap to open. Press and hold for set details." : undefined
      }
    >
      <Image
        source={uri ? { uri, headers: { "User-Agent": SCRYFALL_USER_AGENT } } : undefined}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.scrim}>
        <SetSymbol code={set.keyruneCode || set.code} size={hero ? 34 : 26} />
        <View style={styles.scrimText}>
          <Text
            style={hero ? styles.heroName : styles.name}
            numberOfLines={hero ? 2 : 1}
          >
            {set.name}
          </Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      aspectRatio: 1.45,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: colors.surfaceAlt,
      justifyContent: "flex-end",
    },
    heroTile: {
      aspectRatio: 1.9,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.surfaceAlt,
      justifyContent: "flex-end",
    },
    pressed: { opacity: 0.85 },
    scrim: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: "rgba(10,10,14,0.62)",
    },
    scrimText: { flex: 1 },
    name: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
    heroName: { fontSize: 18, fontWeight: "800", color: "#ffffff" },
    sub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  });
