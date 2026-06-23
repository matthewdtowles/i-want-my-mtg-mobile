import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiCard } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { CardThumb } from "./CardThumb";

export function CardListItem({ card }: { card: ApiCard }) {
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

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  price: { fontSize: 15, fontWeight: "600", color: "#047857" },
});
