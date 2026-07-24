import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

/**
 * The joined two-to-three-button segment (surface background, active = accent)
 * that was hand-rolled in five places with drifted paddings (MB7 2.4). The
 * `size` tiers preserve each site's metrics.
 */
const SIZES = {
  compact: { paddingVertical: 8, fontSize: 14 },
  medium: { paddingVertical: 10, fontSize: 14 },
  large: { paddingVertical: 12, fontSize: 15 },
} as const;

type Option<T extends string | number> = { label: string; value: T };

type Props<T extends string | number> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: keyof typeof SIZES;
  /** Buttons hug their content instead of splitting the row (bulk-add bar). */
  hug?: boolean;
  /** Container overrides (margins, flex). */
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = "medium",
  hug = false,
  style,
}: Props<T>) {
  const styles = useThemedStyles(createStyles);
  const s = SIZES[size];

  return (
    <View style={[styles.segment, style]}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={String(opt.value)}
            style={[
              hug ? styles.btnHug : styles.btn,
              { paddingVertical: s.paddingVertical },
              active && styles.btnActive,
            ]}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[styles.text, { fontSize: s.fontSize }, active && styles.textActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    segment: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      overflow: "hidden",
    },
    btn: { flex: 1, alignItems: "center", backgroundColor: colors.surface },
    btnHug: { paddingHorizontal: 16, alignItems: "center", backgroundColor: colors.surface },
    btnActive: { backgroundColor: colors.accent },
    text: { fontWeight: "600", color: colors.textSecondary },
    textActive: { color: colors.onAccent },
  });
