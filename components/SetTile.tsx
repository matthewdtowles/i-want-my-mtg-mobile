import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { setCoverKey, fetchSetCover } from "../lib/api/catalog";
import type { ApiSet } from "../lib/api/types";
import { cardImageUrl, SCRYFALL_USER_AGENT } from "../lib/images";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { SetSymbol } from "./SetSymbol";

/**
 * A gallery tile for one set: the set's cover art (its first card's art crop)
 * as the background, with the expansion symbol and name over a bottom scrim.
 * `hero` renders the larger featured variant used at the top of the gallery.
 */
export function SetTile({ set, hero = false }: { set: ApiSet; hero?: boolean }) {
  const styles = useThemedStyles(createStyles);

  const cover = useQuery({
    queryKey: setCoverKey(set.code),
    queryFn: () => fetchSetCover(set.code),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const uri = cardImageUrl(cover.data, "art_crop");

  const year = set.releaseDate ? set.releaseDate.slice(0, 4) : null;
  const sub = [year, set.baseSize != null ? `${set.baseSize} cards` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={{ pathname: "/set/[code]", params: { code: set.code } }} asChild>
      <Pressable
        style={({ pressed }) => [
          hero ? styles.heroTile : styles.tile,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={set.name}
      >
        <Image
          source={uri ? { uri, headers: { "User-Agent": SCRYFALL_USER_AGENT } } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
        {hero ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEWEST SET</Text>
          </View>
        ) : null}
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
    </Link>
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
    newBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: colors.accent,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    newBadgeText: {
      color: colors.onAccent,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
  });
