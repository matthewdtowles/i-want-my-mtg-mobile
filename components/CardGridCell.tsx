import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";

import type { ApiCard } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardThumb } from "./CardThumb";

/**
 * One binder-grid cell: tap opens the card page, press-and-hold peeks the
 * full image (handled by the parent via onPeek/onPeekEnd), and the cell
 * itself gives a little press-down squish for tactility.
 */
export function CardGridCell({
  card,
  width,
  onPeek,
  onPeekEnd,
}: {
  card: ApiCard;
  width: number;
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
      style={[styles.cell, { width }]}
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
      accessibilityLabel={card.name}
      accessibilityHint="Tap to open. Press and hold to enlarge."
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <CardThumb imgSrc={card.imgSrc} size="normal" width={width} />
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
  });
