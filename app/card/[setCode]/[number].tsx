import { useQuery } from "@tanstack/react-query";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { cardKey, fetchCard } from "../../../lib/api/catalog";
import { formatPrice } from "../../../lib/format";
import { firstParam } from "../../../lib/params";
import { CardThumb } from "../../../components/CardThumb";
import { AddToInventory } from "../../../components/AddToInventory";
import { AddToBuyList } from "../../../components/AddToBuyList";
import { CardPriceAlert } from "../../../components/CardPriceAlert";
import { CardPriceHistory } from "../../../components/CardPriceHistory";
import { ErrorState } from "../../../components/ErrorState";
import { useTheme, useThemedStyles } from "../../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../../lib/theme/colors";

export default function CardDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    setCode: string | string[];
    number: string | string[];
  }>();
  const setCode = firstParam(params.setCode);
  const number = firstParam(params.number);
  const { width } = useWindowDimensions();

  const query = useQuery({
    queryKey: cardKey(setCode, number),
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
    return <ActivityIndicator style={styles.center} size="large" color={colors.accent} />;
  }
  if (query.isError) {
    return (
      <>
        <Stack.Screen options={{ title: "Card" }} />
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Failed to load."}
          onRetry={() => query.refetch()}
        />
      </>
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
        <Price label="Normal" value={card.prices?.normal} show={card.hasNonFoil} styles={styles} />
        <Price label="Foil" value={card.prices?.foil} show={card.hasFoil} styles={styles} />
      </View>

      <AddToInventory
        cardId={card.id}
        hasNonFoil={card.hasNonFoil}
        hasFoil={card.hasFoil}
      />

      <AddToBuyList
        cardId={card.id}
        hasNonFoil={card.hasNonFoil}
        hasFoil={card.hasFoil}
      />

      <CardPriceAlert cardId={card.id} />

      <CardPriceHistory
        cardId={card.id}
        hasNonFoil={card.hasNonFoil}
        hasFoil={card.hasFoil}
      />

      <Link
        href={{
          pathname: "/transaction/new",
          params: {
            cardId: card.id,
            name: card.name,
            setCode: card.setCode,
            number: card.number,
            hasFoil: String(card.hasFoil),
            hasNonFoil: String(card.hasNonFoil),
          },
        }}
        asChild
      >
        <Pressable style={styles.logBtn}>
          <Text style={styles.logBtnText}>Log a transaction</Text>
        </Pressable>
      </Link>

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
  styles,
}: {
  label: string;
  value: number | null | undefined;
  show: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  if (!show) return null;
  return (
    <View style={styles.priceTile}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{formatPrice(value)}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 24, gap: 6, backgroundColor: colors.background },
    center: { marginTop: 40 },
    message: { textAlign: "center", marginTop: 40, color: colors.textMuted },
    imageWrap: { alignItems: "center", marginBottom: 12 },
    name: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
    meta: { fontSize: 15, color: colors.textSecondary },
    prices: { flexDirection: "row", gap: 12, marginVertical: 12 },
    priceTile: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.successBorder,
      backgroundColor: colors.successBg,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
    },
    priceLabel: { fontSize: 13, color: colors.success },
    priceValue: { fontSize: 18, fontWeight: "700", color: colors.success, marginTop: 2 },
    oracle: { fontSize: 15, lineHeight: 22, marginTop: 8, color: colors.textPrimary },
    artist: { fontSize: 13, color: colors.textMuted, marginTop: 12 },
    logBtn: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    logBtnText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  });
