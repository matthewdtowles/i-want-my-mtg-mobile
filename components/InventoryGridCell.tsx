import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiInventoryItem } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardThumb } from "./CardThumb";
import { QuantityStepper } from "./QuantityStepper";

/**
 * One binder-grid cell in the collection: the same 3-up card face the set page
 * shows, with an owned-count badge.
 *
 * Interaction mirrors direct-manipulation collection apps: the *first* tap
 * turns the cell into its own controls (stepper + remove + open) rather than
 * navigating away, so the common action — adjusting a count — costs one tap and
 * never leaves the grid. Opening the card is then an explicit second tap. Only
 * one cell is expanded at a time; the parent owns that.
 */
export function InventoryGridCell({
  item,
  width,
  expanded,
  onToggleExpand,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: ApiInventoryItem;
  width: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const price = item.isFoil ? item.priceFoil : item.priceNormal;
  const navigable = !!item.setCode && !!item.cardNumber;

  return (
    <View style={[styles.cell, { width }]}>
      <Pressable
        onPress={onToggleExpand}
        accessibilityRole="button"
        accessibilityLabel={item.cardName ?? item.cardId}
        accessibilityState={{ expanded }}
        accessibilityHint={
          expanded ? "Tap to collapse." : "Tap for quantity controls."
        }
      >
        <CardThumb imgSrc={item.imgSrc} size="normal" width={width} />

        {/* Owned count sits on the art, the way a binder page label would. */}
        <View style={[styles.qtyBadge, item.isFoil && styles.qtyBadgeFoil]}>
          <Text style={styles.qtyBadgeText}>
            {item.quantity}
            {item.isFoil ? " ✦" : ""}
          </Text>
        </View>

        {expanded ? (
          <View style={styles.overlay}>
            <QuantityStepper
              quantity={item.quantity}
              size={32}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
              subject={`${item.cardName ?? "card"} quantity`}
            />
            {navigable ? (
              <Pressable
                style={styles.openBtn}
                onPress={() =>
                  router.push({
                    pathname: "/card/[setCode]/[number]",
                    params: { setCode: item.setCode, number: item.cardNumber },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.cardName ?? "card"}`}
              >
                <Text style={styles.openText}>Open</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.onAccent} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <Text style={styles.name} numberOfLines={1}>
        {item.cardName ?? item.cardId}
      </Text>
      <Text style={styles.price}>{formatPrice(price)}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    cell: { alignItems: "center" },
    name: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: "600",
      color: colors.textSecondary,
      textAlign: "center",
    },
    price: { fontSize: 12, fontWeight: "600", color: colors.success },
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
    qtyBadgeFoil: { backgroundColor: colors.accent },
    qtyBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
    overlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 4,
      borderRadius: 8,
      // Opaque surface rather than a dark scrim: the stepper's glyphs are
      // themed for surface backgrounds and would fade out over the art.
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    openBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    openText: { color: colors.onAccent, fontSize: 12, fontWeight: "700" },
  });
