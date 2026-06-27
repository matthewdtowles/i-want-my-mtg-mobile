import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ApiTransaction } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

export function TransactionListItem({ tx }: { tx: ApiTransaction }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isSell = tx.type === "SELL";
  const total = tx.quantity * tx.pricePerUnit;
  return (
    <View style={styles.row}>
      <View style={[styles.badge, isSell ? styles.sell : styles.buy]}>
        <Text style={[styles.badgeText, isSell ? styles.sellText : styles.buyText]}>
          {tx.type}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {tx.cardName ?? tx.cardId}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {(tx.setCode ?? "").toUpperCase()}
          {tx.cardNumber ? ` #${tx.cardNumber}` : ""}
          {tx.isFoil ? " · Foil" : ""} · {tx.date}
        </Text>
      </View>
      <View style={styles.amount}>
        <Text style={styles.total}>{formatPrice(total)}</Text>
        <Text style={styles.unit}>
          {tx.quantity} × {formatPrice(tx.pricePerUnit)}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    badge: {
      width: 44,
      paddingVertical: 3,
      borderRadius: 6,
      alignItems: "center",
    },
    buy: { backgroundColor: colors.buyBg },
    sell: { backgroundColor: colors.sellBg },
    badgeText: { fontSize: 11, fontWeight: "700" },
    buyText: { color: colors.buyText },
    sellText: { color: colors.sellText },
    body: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    amount: { alignItems: "flex-end" },
    total: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    unit: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  });
