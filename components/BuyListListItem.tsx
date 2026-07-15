import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ApiBuyListItem } from "../lib/api/types";
import { formatPrice } from "../lib/format";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardThumb } from "./CardThumb";

type Props = {
  item: ApiBuyListItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function BuyListListItem({ item, onIncrement, onDecrement, onRemove }: Props) {
  const styles = useThemedStyles(createStyles);
  const price = item.isFoil ? item.priceFoil : item.priceNormal;
  // Card fields are optional on the DTO; only link to detail when navigable.
  const navigable = !!item.setCode && !!item.cardNumber;
  const cardContent = (
    <>
      <CardThumb imgSrc={item.imgSrc} size="small" width={44} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.cardName ?? item.cardId}
        </Text>
        <View style={styles.subRow}>
          <Text style={styles.sub} numberOfLines={1}>
            {(item.setCode ?? "").toUpperCase()}
            {item.cardNumber ? ` #${item.cardNumber}` : ""}
          </Text>
          <View style={[styles.badge, item.isFoil && styles.foilBadge]}>
            <Text style={[styles.badgeText, item.isFoil && styles.foilBadgeText]}>
              {item.isFoil ? "Foil" : "Normal"}
            </Text>
          </View>
        </View>
        <Text style={styles.price}>{formatPrice(price)} each</Text>
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {navigable ? (
        <Link
          href={{
            pathname: "/card/[setCode]/[number]",
            params: { setCode: item.setCode, number: item.cardNumber },
          }}
          asChild
        >
          <Pressable style={styles.cardLink}>{cardContent}</Pressable>
        </Link>
      ) : (
        <View style={styles.cardLink}>{cardContent}</View>
      )}

      <View style={styles.stepper}>
        <Pressable
          onPress={item.quantity <= 1 ? onRemove : onDecrement}
          hitSlop={8}
          style={styles.stepBtn}
          accessibilityLabel={item.quantity <= 1 ? "Remove" : "Decrease quantity"}
        >
          <Text style={styles.stepText}>{item.quantity <= 1 ? "🗑" : "−"}</Text>
        </Pressable>
        <Text style={styles.qty}>{item.quantity}</Text>
        <Pressable
          onPress={onIncrement}
          hitSlop={8}
          style={styles.stepBtn}
          accessibilityLabel="Increase quantity"
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    cardLink: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    body: { flex: 1 },
    name: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    subRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    sub: { fontSize: 13, color: colors.textMuted },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: colors.badgeBg,
    },
    foilBadge: { backgroundColor: colors.foilBg },
    badgeText: { fontSize: 11, fontWeight: "600", color: colors.badgeText },
    foilBadgeText: { color: colors.foilText },
    price: { fontSize: 13, color: colors.success, marginTop: 2 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 8 },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    stepText: { fontSize: 18, color: colors.textSecondary },
    qty: {
      fontSize: 16,
      fontWeight: "600",
      minWidth: 24,
      textAlign: "center",
      color: colors.textPrimary,
    },
  });
