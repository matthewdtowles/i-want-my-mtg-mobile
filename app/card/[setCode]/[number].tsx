import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { fetchCard } from "../../../lib/api/catalog";
import { formatPrice } from "../../../lib/format";
import { CardThumb } from "../../../components/CardThumb";

export default function CardDetailScreen() {
  const params = useLocalSearchParams<{
    setCode: string | string[];
    number: string | string[];
  }>();
  const setCode = Array.isArray(params.setCode) ? params.setCode[0] : params.setCode;
  const number = Array.isArray(params.number) ? params.number[0] : params.number;
  const { width } = useWindowDimensions();

  const query = useQuery({
    queryKey: ["card", setCode, number],
    queryFn: () => fetchCard(setCode as string, number as string),
    enabled: !!setCode && !!number,
  });

  if (!setCode || !number) {
    return (
      <>
        <Stack.Screen options={{ title: "Card" }} />
        <Text style={styles.message}>Card not found.</Text>
      </>
    );
  }
  if (query.isPending) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (query.isError) {
    return (
      <Text style={styles.message}>
        {query.error instanceof Error ? query.error.message : "Failed to load."}
      </Text>
    );
  }

  const card = query.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: card.name }} />

      <View style={styles.imageWrap}>
        <CardThumb imgSrc={card.imgSrc} size="normal" width={Math.min(width - 48, 320)} />
      </View>

      <Text style={styles.name}>{card.name}</Text>
      {card.manaCost ? <Text style={styles.meta}>{card.manaCost}</Text> : null}
      <Text style={styles.meta}>
        {[card.type, card.rarity].filter(Boolean).join(" · ")}
      </Text>
      <Text style={styles.meta}>
        {card.setName ?? card.setCode.toUpperCase()} #{card.number}
      </Text>

      <View style={styles.prices}>
        <Price label="Normal" value={card.prices?.normal} show={card.hasNonFoil} />
        <Price label="Foil" value={card.prices?.foil} show={card.hasFoil} />
      </View>

      {card.oracleText ? (
        <Text style={styles.oracle}>{card.oracleText}</Text>
      ) : null}

      {card.artist ? (
        <Text style={styles.artist}>Illustrated by {card.artist}</Text>
      ) : null}
    </ScrollView>
  );
}

function Price({
  label,
  value,
  show,
}: {
  label: string;
  value: number | null | undefined;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <View style={styles.priceTile}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{formatPrice(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 6 },
  center: { marginTop: 40 },
  message: { textAlign: "center", marginTop: 40, color: "#6b7280" },
  imageWrap: { alignItems: "center", marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 15, color: "#4b5563" },
  prices: { flexDirection: "row", gap: 12, marginVertical: 12 },
  priceTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1fae5",
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  priceLabel: { fontSize: 13, color: "#047857" },
  priceValue: { fontSize: 18, fontWeight: "700", color: "#047857", marginTop: 2 },
  oracle: { fontSize: 15, lineHeight: 22, marginTop: 8 },
  artist: { fontSize: 13, color: "#9ca3af", marginTop: 12 },
});
