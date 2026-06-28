import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiNotification } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  item: ApiNotification;
  onPress: () => void;
};

export function NotificationListItem({ item, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rose = item.newPrice >= item.oldPrice;
  const when = new Date(item.createdAt).toLocaleDateString();

  return (
    <Pressable
      style={[styles.row, !item.isRead && styles.rowUnread]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Notification for ${item.cardName ?? item.cardId}${item.isRead ? "" : ", unread"}`}
    >
      <View style={styles.dotColumn}>
        {!item.isRead ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, !item.isRead && styles.nameUnread]} numberOfLines={1}>
          {item.cardName ?? item.cardId}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          <Text style={{ color: rose ? colors.success : colors.danger }}>
            {rose ? "▲" : "▼"} {Math.abs(item.changePct).toFixed(1)}%
          </Text>
          {"  "}
          {formatPrice(item.oldPrice)} → {formatPrice(item.newPrice)}
        </Text>
        <Text style={styles.when}>
          {(item.setCode ?? "").toUpperCase()}
          {item.cardNumber ? ` #${item.cardNumber} · ` : item.setCode ? " · " : ""}
          {when}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowUnread: { backgroundColor: colors.surface },
    dotColumn: { width: 16, paddingTop: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    body: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    nameUnread: { fontWeight: "700" },
    detail: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    when: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  });
