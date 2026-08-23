import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiCard } from "../lib/api/types";
import { formatPrice, listPrice } from "../lib/format";
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
  const price = listPrice(card.prices);

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
      <View style={styles.priceCol}>
        <Text style={styles.price}>{formatPrice(price.value)}</Text>
        {price.isFoil ? <Text style={styles.priceFoil}>foil</Text> : null}
      </View>
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
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`View ${card.name}`}
      >
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
    rowPressed: { backgroundColor: colors.surfaceAlt },
    body: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    priceCol: { alignItems: "flex-end" },
    price: { fontSize: 15, fontWeight: "600", color: colors.success },
    // A foil-only card's price is not the price of the normal printing, so say
    // which one it is rather than letting it read as the default finish.
    priceFoil: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  });
