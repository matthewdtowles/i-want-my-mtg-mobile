import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

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
  const [isFoil, setIsFoil] = useState(false);
  const [qty, setQty] = useState(1);

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
        <View style={styles.finish}>
          {([
            { label: "Normal", foil: false },
            { label: "Foil", foil: true },
          ] as const).map((opt) => {
            const active = isFoil === opt.foil;
            return (
              <Pressable
                key={opt.label}
                style={[styles.finishBtn, active && styles.finishBtnActive]}
                onPress={() => setIsFoil(opt.foil)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.finishText, active && styles.finishTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            hitSlop={8}
            style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
            accessibilityLabel="Decrease quantity"
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{qty}</Text>
          <Pressable
            onPress={() => setQty((q) => q + 1)}
            hitSlop={8}
            style={styles.stepBtn}
            accessibilityLabel="Increase quantity"
          >
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
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
    finish: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      overflow: "hidden",
    },
    finishBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.surface },
    finishBtnActive: { backgroundColor: colors.accent },
    finishText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    finishTextActive: { color: colors.onAccent },
    stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    stepBtnDisabled: { opacity: 0.4 },
    stepText: { fontSize: 20, color: colors.textSecondary },
    qty: { fontSize: 17, fontWeight: "600", minWidth: 24, textAlign: "center", color: colors.textPrimary },
    addBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
    },
    addBtnDisabled: { opacity: 0.5 },
    addText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
  });
