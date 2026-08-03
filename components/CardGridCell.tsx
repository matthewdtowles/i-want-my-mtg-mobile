import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiCard } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import type { OwnedCounts } from "../lib/ownedCards";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardThumb } from "./CardThumb";

/** How far a card the user doesn't own fades back in collection mode. */
const UNOWNED_OPACITY = 0.28;

/**
 * One binder-grid cell: tap opens the card page, press-and-hold peeks the
 * full image (handled by the parent via onPeek/onPeekEnd), and the cell
 * itself gives a little press-down squish for tactility.
 *
 * In the set page's collection mode the cell also carries owned state: cards
 * in the collection keep full opacity and gain a count badge, cards missing
 * from it fade back, so a set page reads as a binder with gaps.
 */
export function CardGridCell({
  card,
  width,
  owned,
  dim = false,
  onPeek,
  onPeekEnd,
}: {
  card: ApiCard;
  width: number;
  /** Copies held, when collection mode is on and the card is in the collection. */
  owned?: OwnedCounts;
  /** Collection mode is on and this card is known to be missing. */
  dim?: boolean;
  onPeek: (card: ApiCard) => void;
  onPeekEnd: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [scale] = useState(() => new Animated.Value(1));
  const peeking = useRef(false);

  function squish(to: number) {
    Animated.spring(scale, {
      toValue: to,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      // `owned` wins over `dim` here the same way it does in the label below,
      // so a cell can never read as owned and missing at once.
      style={[styles.cell, { width }, dim && !owned && { opacity: UNOWNED_OPACITY }]}
      onPressIn={() => squish(0.96)}
      onPressOut={() => {
        squish(1);
        if (peeking.current) {
          peeking.current = false;
          onPeekEnd();
        }
      }}
      // A long-press (peek) cancels onPress, so releasing a peek never navigates.
      onPress={() => {
        router.push({
          pathname: "/card/[setCode]/[number]",
          params: { setCode: card.setCode, number: card.number },
        });
      }}
      onLongPress={() => {
        peeking.current = true;
        onPeek(card);
      }}
      delayLongPress={220}
      accessibilityRole="button"
      accessibilityLabel={
        owned
          ? `${card.name}, ${owned.normal + owned.foil} owned`
          : dim
            ? `${card.name}, not owned`
            : card.name
      }
      accessibilityHint="Tap to open. Press and hold to enlarge."
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <CardThumb imgSrc={card.imgSrc} size="normal" width={width} />
        {owned ? (
          <View style={styles.qtyBadge}>
            <Text style={styles.qtyBadgeText}>
              {owned.normal + owned.foil}
              {owned.foil > 0 ? " ✦" : ""}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <Text style={styles.price}>{formatPrice(card.prices?.normal)}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    cell: { alignItems: "center" },
    price: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "600",
      color: colors.success,
    },
    // Same badge the collection grid puts on the art, so a card reads the same
    // way in either place.
    qtyBadge: {
      position: "absolute",
      top: 5,
      right: 5,
      minWidth: 22,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 9,
      alignItems: "center",
      backgroundColor: "rgba(10,10,14,0.78)",
    },
    qtyBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  });
