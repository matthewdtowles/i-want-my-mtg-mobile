import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { QuantityStepper } from "./QuantityStepper";
import { SegmentedControl } from "./SegmentedControl";

type Props = {
  count: number;
  submitting: boolean;
  onAdd: (isFoil: boolean, qty: number) => void;
  onCancel: () => void;
};

/**
 * Bottom action bar shown while multi-selecting cards: pick a finish and a
 * per-card quantity, then add the selection to inventory.
 */
export function BulkAddBar({ count, submitting, onAdd, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [finish, setFinish] = useState<"normal" | "foil">("normal");
  const [qty, setQty] = useState(1);

  const isFoil = finish === "foil";
  const disabled = count === 0 || submitting;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topRow}>
        <Text style={styles.count}>
          {count} selected{count > 0 ? ` · ${qty} each` : ""}
        </Text>
        <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.controls}>
        <SegmentedControl
          options={[
            { label: "Normal", value: "normal" },
            { label: "Foil", value: "foil" },
          ]}
          value={finish}
          onChange={setFinish}
          size="compact"
          hug
        />

        <QuantityStepper
          quantity={qty}
          min={1}
          onDecrement={() => setQty((q) => Math.max(1, q - 1))}
          onIncrement={() => setQty((q) => q + 1)}
        />
      </View>

      <Pressable
        style={[styles.addBtn, disabled && styles.addBtnDisabled]}
        onPress={() => onAdd(isFoil, qty)}
        disabled={disabled}
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.addText}>Add to inventory</Text>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 12,
    },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    count: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    cancel: { fontSize: 15, color: colors.accent, fontWeight: "600" },
    controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    addBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    addBtnDisabled: { opacity: 0.5 },
    addText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
  });
