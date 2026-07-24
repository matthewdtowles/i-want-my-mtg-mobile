import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { ApiCard } from "../lib/api/types";
import { CardThumb } from "./CardThumb";

/**
 * The press-and-hold "peek": the card springs up over a dimmed backdrop with a
 * slight tilt, like lifting a card out of a binder page. The parent shows it
 * on long-press and hides it on press-out, so it never captures touches
 * itself (pointerEvents none).
 */
export function CardPeekOverlay({ card }: { card: ApiCard | null }) {
  const { width } = useWindowDimensions();
  const [scale] = useState(() => new Animated.Value(0.55));
  const [opacity] = useState(() => new Animated.Value(0));
  // A fresh subtle tilt each peek, like a hand-held card (set in the effect,
  // where randomness is allowed; render stays pure).
  const [tilt] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!card) return;
    tilt.setValue(Math.random() * 4 - 2);
    scale.setValue(0.55);
    opacity.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [card, scale, opacity, tilt]);

  if (!card) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]} pointerEvents="none">
      <Animated.View
        style={{
          opacity,
          transform: [
            { scale },
            {
              rotate: tilt.interpolate({
                inputRange: [-2, 2],
                outputRange: ["-2deg", "2deg"],
              }),
            },
          ],
          alignItems: "center",
        }}
      >
        <CardThumb imgSrc={card.imgSrc} size="normal" width={Math.min(width - 64, 340)} />
        <Text style={styles.caption} numberOfLines={1}>
          {card.name}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  caption: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
