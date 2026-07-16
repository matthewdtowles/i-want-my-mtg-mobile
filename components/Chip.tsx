import { Pressable, StyleSheet, Text } from "react-native";

import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

/**
 * The pill chip (surface background, active = accent) that was re-implemented
 * in the inventory filters, deck format picker, and price-history ranges
 * (MB7 2.4). The `size` tiers preserve each site's metrics.
 */
const SIZES = {
  small: { paddingVertical: 5, borderRadius: 14, fontSize: 12 },
  medium: { paddingVertical: 6, borderRadius: 16, fontSize: 13 },
  large: { paddingVertical: 8, borderRadius: 16, fontSize: 14 },
} as const;

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
  size?: keyof typeof SIZES;
};

export function Chip({ label, active, onPress, size = "medium" }: Props) {
  const styles = useThemedStyles(createStyles);
  const s = SIZES[size];

  return (
    <Pressable
      style={[
        styles.chip,
        { paddingVertical: s.paddingVertical, borderRadius: s.borderRadius },
        active && styles.chipActive,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, { fontSize: s.fontSize }, active && styles.textActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    chip: {
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    text: { fontWeight: "600", color: colors.textSecondary },
    textActive: { color: colors.onAccent },
  });
