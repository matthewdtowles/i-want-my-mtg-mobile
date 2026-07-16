import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../lib/format";
import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardThumb } from "./CardThumb";
import { QuantityStepper } from "./QuantityStepper";

/**
 * The card fields both the inventory and buy-list rows render. Both API DTOs
 * (`ApiInventoryItem` / `ApiBuyListItem`) satisfy this shape, so this one row
 * component backs both lists (they were ~identical - MB7 2.2).
 */
export type CardQuantityRowItem = {
  cardId: string;
  cardName?: string;
  setCode?: string;
  cardNumber?: string;
  imgSrc?: string;
  isFoil: boolean;
  quantity: number;
  priceNormal?: number;
  priceFoil?: number;
};

type Props = {
  item: CardQuantityRowItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CardQuantityRow({ item, onIncrement, onDecrement, onRemove }: Props) {
  const styles = useThemedStyles(createStyles);
  const price = item.isFoil ? item.priceFoil : item.priceNormal;
  // setCode/cardNumber are optional on the DTO (absent for orphan rows whose
  // card relation is null); only link to the card detail when both are present.
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
        <QuantityStepper
          quantity={item.quantity}
          size={32}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onRemove={onRemove}
        />
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
    stepper: { marginLeft: 8 },
  });
