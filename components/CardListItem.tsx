import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiCard } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardThumb } from "./CardThumb";

// Discriminated union: selection mode requires both `selected` and
// `onToggleSelect`, so a selectable row can never be missing its handler.
type Props = { card: ApiCard } & (
  | { selectable?: false; selected?: never; onToggleSelect?: never }
  | { selectable: true; selected: boolean; onToggleSelect: () => void }
);

export function CardListItem({ card, selectable, selected, onToggleSelect }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const body = (
    <>
      {selectable ? (
        <Ionicons
          name={selected ? "checkbox" : "square-outline"}
          size={24}
          color={selected ? colors.accent : colors.textMuted}
        />
      ) : null}
      <CardThumb imgSrc={card.imgSrc} size="small" width={44} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {card.setName ?? card.setCode.toUpperCase()} #{card.number}
        </Text>
      </View>
      <Text style={styles.price}>{formatPrice(card.prices?.normal)}</Text>
    </>
  );

  // Selection mode: the whole row toggles the checkbox.
  if (selectable) {
    return (
      <Pressable
        style={[styles.row, selected && styles.rowSelected]}
        onPress={onToggleSelect}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!selected }}
        accessibilityLabel={card.name}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <Link
      href={{
        pathname: "/card/[setCode]/[number]",
        params: { setCode: card.setCode, number: card.number },
      }}
      asChild
    >
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowSelected]}>
        {body}
      </Pressable>
    </Link>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    rowSelected: { backgroundColor: colors.surfaceAlt },
    body: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    price: { fontSize: 15, fontWeight: "600", color: colors.success },
  });
