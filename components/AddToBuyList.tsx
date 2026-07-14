import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { BUY_LIST_KEY, fetchBuyList, setBuyListQuantity } from "../lib/api/buyList";
import type { ApiBuyListItem } from "../lib/api/types";
import { useDebouncedByKey } from "../lib/useDebouncedByKey";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  cardId: string;
  hasNonFoil: boolean;
  hasFoil: boolean;
};

const KEY = BUY_LIST_KEY;

function wanted(items: ApiBuyListItem[] | undefined, cardId: string, isFoil: boolean): number {
  return items?.find((it) => it.cardId === cardId && it.isFoil === isFoil)?.quantity ?? 0;
}

function upsert(
  items: ApiBuyListItem[] | undefined,
  cardId: string,
  isFoil: boolean,
  quantity: number,
): ApiBuyListItem[] {
  const list = items ?? [];
  const idx = list.findIndex((it) => it.cardId === cardId && it.isFoil === isFoil);
  if (idx === -1) {
    return quantity <= 0 ? list : [...list, { cardId, isFoil, quantity }];
  }
  const next = [...list];
  if (quantity <= 0) next.splice(idx, 1);
  else next[idx] = { ...next[idx], quantity };
  return next;
}

export function AddToBuyList({ cardId, hasNonFoil, hasFoil }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: KEY, queryFn: fetchBuyList });

  // Debounced absolute-quantity write: the tap handler updates the cache
  // instantly and settle re-syncs (so an optimistic insert picks up the card's
  // name/price fields and any drift self-heals).
  const setQty = useMutation({
    mutationFn: ({ isFoil, quantity }: { isFoil: boolean; quantity: number }) =>
      setBuyListQuantity(cardId, isFoil, quantity),
    onError(err) {
      Alert.alert(
        "Couldn't update your buy-list",
        err instanceof Error ? err.message : "Please try again.",
      );
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const writeQty = useDebouncedByKey(
    (isFoil: boolean, quantity: number) => setQty.mutate({ isFoil, quantity }),
  );

  function step(isFoil: boolean, quantity: number) {
    queryClient.setQueryData<ApiBuyListItem[]>(KEY, (old) =>
      upsert(old, cardId, isFoil, quantity),
    );
    writeQty(isFoil ? "foil" : "normal", isFoil, quantity);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>On your buy-list</Text>
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : query.isError ? (
        <Text style={styles.error}>Couldn’t load your buy-list for this card.</Text>
      ) : (
        <View style={styles.rows}>
          {hasNonFoil ? (
            <FinishStepper
              label="Normal"
              quantity={wanted(query.data, cardId, false)}
              onChange={(quantity) => step(false, quantity)}
              styles={styles}
            />
          ) : null}
          {hasFoil ? (
            <FinishStepper
              label="Foil"
              quantity={wanted(query.data, cardId, true)}
              onChange={(quantity) => step(true, quantity)}
              styles={styles}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function FinishStepper({
  label,
  quantity,
  onChange,
  styles,
}: {
  label: string;
  quantity: number;
  onChange: (quantity: number) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.finishRow}>
      <Text style={styles.finishLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(quantity - 1)}
          disabled={quantity <= 0}
          hitSlop={8}
          style={[styles.stepBtn, quantity <= 0 && styles.stepBtnDisabled]}
          accessibilityLabel={`Decrease ${label.toLowerCase()} buy-list quantity`}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.qty}>{quantity}</Text>
        <Pressable
          onPress={() => onChange(quantity + 1)}
          hitSlop={8}
          style={styles.stepBtn}
          accessibilityLabel={`Increase ${label.toLowerCase()} buy-list quantity`}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      backgroundColor: colors.surface,
    },
    heading: { fontSize: 16, fontWeight: "700", marginBottom: 8, color: colors.textPrimary },
    loading: { marginVertical: 8 },
    error: { color: colors.danger, fontSize: 14 },
    rows: { gap: 12 },
    finishRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    finishLabel: { fontSize: 15, color: colors.textSecondary },
    stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    stepBtnDisabled: { opacity: 0.4 },
    stepText: { fontSize: 20, color: colors.textSecondary },
    qty: {
      fontSize: 17,
      fontWeight: "600",
      minWidth: 24,
      textAlign: "center",
      color: colors.textPrimary,
    },
  });
