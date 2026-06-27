import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiCard } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardThumb } from "./CardThumb";

export function CardListItem({ card }: { card: ApiCard }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Link
      href={{
        pathname: "/card/[setCode]/[number]",
        params: { setCode: card.setCode, number: card.number },
      }}
      asChild
    >
      <Pressable style={styles.row}>
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
    body: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    price: { fontSize: 15, fontWeight: "600", color: colors.success },
  });
