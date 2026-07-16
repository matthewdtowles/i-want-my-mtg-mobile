import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

/**
 * The − [qty] + stepper. This was duplicated wholesale in the two card-panel
 * components and re-implemented inline in the deck detail, bulk-add bar, and
 * card-quantity rows (MB7 2.3); the `size` tiers preserve each site's metrics.
 */
const SIZES = {
  36: { gap: 12, stepFont: 20, qtyFont: 17, qtyMinWidth: 24 },
  34: { gap: 10, stepFont: 20, qtyFont: 16, qtyMinWidth: 22 },
  32: { gap: 6, stepFont: 18, qtyFont: 16, qtyMinWidth: 24 },
} as const;

type Props = {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** When provided, the minus button becomes a remove (🗑) action at quantity ≤ 1. */
  onRemove?: () => void;
  /**
   * Disable the minus button once quantity is at this floor. Omit to keep it
   * always enabled (sites where stepping past the floor removes server-side).
   */
  min?: number;
  /** Button diameter tier (see SIZES). */
  size?: keyof typeof SIZES;
  /** Accessibility subject: "normal quantity" → "Decrease normal quantity". */
  subject?: string;
};

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
  min,
  size = 36,
  subject = "quantity",
}: Props) {
  const styles = useThemedStyles(createStyles);
  const s = SIZES[size];
  const btnSize = { width: size, height: size, borderRadius: size / 2 };

  const removing = onRemove != null && quantity <= 1;
  const decrementDisabled = !removing && min != null && quantity <= min;

  return (
    <View style={[styles.stepper, { gap: s.gap }]}>
      <Pressable
        onPress={removing ? onRemove : onDecrement}
        disabled={decrementDisabled}
        hitSlop={8}
        style={[styles.stepBtn, btnSize, decrementDisabled && styles.stepBtnDisabled]}
        accessibilityLabel={removing ? "Remove" : `Decrease ${subject}`}
      >
        <Text style={[styles.stepText, { fontSize: s.stepFont }]}>
          {removing ? "🗑" : "−"}
        </Text>
      </Pressable>
      <Text style={[styles.qty, { fontSize: s.qtyFont, minWidth: s.qtyMinWidth }]}>
        {quantity}
      </Text>
      <Pressable
        onPress={onIncrement}
        hitSlop={8}
        style={[styles.stepBtn, btnSize]}
        accessibilityLabel={`Increase ${subject}`}
      >
        <Text style={[styles.stepText, { fontSize: s.stepFont }]}>+</Text>
      </Pressable>
    </View>
  );
}

/**
 * A finish's labeled stepper row ("Normal −[2]+") in the card-detail panels.
 * `onChange` gets the desired absolute quantity; `subjectSuffix` customizes the
 * accessibility label ("normal buy-list quantity" vs "normal quantity").
 */
export function FinishStepper({
  label,
  quantity,
  onChange,
  subjectSuffix = "quantity",
}: {
  label: string;
  quantity: number;
  onChange: (quantity: number) => void;
  subjectSuffix?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.finishRow}>
      <Text style={styles.finishLabel}>{label}</Text>
      <QuantityStepper
        quantity={quantity}
        min={0}
        onDecrement={() => onChange(quantity - 1)}
        onIncrement={() => onChange(quantity + 1)}
        subject={`${label.toLowerCase()} ${subjectSuffix}`}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    stepper: { flexDirection: "row", alignItems: "center" },
    finishRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    finishLabel: { fontSize: 15, color: colors.textSecondary },
    stepBtn: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    stepBtnDisabled: { opacity: 0.4 },
    stepText: { color: colors.textSecondary },
    qty: { fontWeight: "600", textAlign: "center", color: colors.textPrimary },
  });
