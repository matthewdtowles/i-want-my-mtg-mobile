import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import type { ApiSet } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { effectiveSetSize } from "../lib/setSize";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { SetSymbol } from "./SetSymbol";

/**
 * The press-and-hold companion to the card peek: holding a set tile lifts a
 * summary card with the detail the tile has no room for — set value, weekly
 * move, size, and (signed in) what you own. Like the card peek it never takes
 * touches, so releasing the tile dismisses it.
 */
export function SetPeekOverlay({ set }: { set: ApiSet | null }) {
  const styles = useThemedStyles(createStyles);
  const [scale] = useState(() => new Animated.Value(0.85));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!set) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [set, scale, opacity]);

  if (!set) return null;

  const prices = set.prices;
  const change = prices?.basePriceChangeWeekly;

  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]} pointerEvents="none">
      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <View style={styles.header}>
          <SetSymbol code={set.keyruneCode || set.code} size={30} />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={2}>
              {set.name}
            </Text>
            <Text style={styles.sub}>
              {[set.code.toUpperCase(), set.releaseDate || null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>

        <Stat label="Set value" value={formatPrice(prices?.basePrice)} />
        {change != null ? (
          <Stat
            label="Past week"
            value={`${change >= 0 ? "+" : "−"}${formatPrice(Math.abs(change))}`}
            tone={change >= 0 ? "up" : "down"}
          />
        ) : null}
        <Stat
          label="Cards"
          value={
            // A bonus set has no base half, so "0 base" is noise there.
            set.baseSize
              ? `${set.baseSize} base · ${set.totalSize} total`
              : `${effectiveSetSize(set) ?? 0} total`
          }
        />
        {set.ownedTotal != null ? (
          <Stat
            label="You own"
            value={
              set.ownedTotal +
              (set.completionRate != null
                ? ` · ${Math.round(set.completionRate)}%`
                : "")
            }
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          tone === "up" && styles.up,
          tone === "down" && styles.down,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      backgroundColor: "rgba(0,0,0,0.72)",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      zIndex: 10,
    },
    card: {
      alignSelf: "stretch",
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      gap: 10,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 12 },
    headerText: { flex: 1 },
    name: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
    sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    statLabel: { fontSize: 13, color: colors.textMuted },
    statValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
    up: { color: colors.success },
    down: { color: colors.danger },
  });
