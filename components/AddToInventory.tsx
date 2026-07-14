import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  INVENTORY_KEY,
  fetchQuantities,
  inventoryQuantitiesKey,
  saveInventory,
} from "../lib/api/inventory";
import type { ApiInventoryQuantity } from "../lib/api/types";
import { useDebouncedByKey } from "../lib/useDebouncedByKey";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

type Props = {
  cardId: string;
  hasNonFoil: boolean;
  hasFoil: boolean;
};

function readQty(rows: ApiInventoryQuantity[] | undefined, cardId: string) {
  const row = rows?.find((r) => r.cardId === cardId);
  return { normal: row?.normalQuantity ?? 0, foil: row?.foilQuantity ?? 0 };
}

function upsertQty(
  rows: ApiInventoryQuantity[] | undefined,
  cardId: string,
  isFoil: boolean,
  quantity: number,
): ApiInventoryQuantity[] {
  const current = readQty(rows, cardId);
  const next: ApiInventoryQuantity = {
    cardId,
    normalQuantity: isFoil ? current.normal : quantity,
    foilQuantity: isFoil ? quantity : current.foil,
  };
  const others = (rows ?? []).filter((r) => r.cardId !== cardId);
  return [...others, next];
}

export function AddToInventory({ cardId, hasNonFoil, hasFoil }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const key = inventoryQuantitiesKey(cardId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchQuantities([cardId]),
  });

  // Debounced absolute-quantity write: the tap handler updates the cache
  // instantly, and settle re-syncs the whole inventory family (INVENTORY_KEY
  // covers this card's inventoryQuantitiesKey too).
  const setQty = useMutation({
    mutationFn: ({ isFoil, quantity }: { isFoil: boolean; quantity: number }) =>
      saveInventory([{ cardId, quantity, isFoil }]),
    onError(err) {
      Alert.alert(
        "Couldn't update quantity",
        err instanceof Error ? err.message : "Please try again.",
      );
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });

  const writeQty = useDebouncedByKey(
    (isFoil: boolean, quantity: number) => setQty.mutate({ isFoil, quantity }),
  );

  function step(isFoil: boolean, quantity: number) {
    queryClient.setQueryData<ApiInventoryQuantity[]>(key, (old) =>
      upsertQty(old, cardId, isFoil, quantity),
    );
    writeQty(isFoil ? "foil" : "normal", isFoil, quantity);
  }

  const owned = readQty(query.data, cardId);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>In your inventory</Text>
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : query.isError ? (
        // Don't fall through to the steppers: they'd seed from 0, and a tap
        // would upsert an absolute quantity that clobbers the real owned count.
        <Text style={styles.error}>Couldn’t load your quantities for this card.</Text>
      ) : (
        <View style={styles.rows}>
          {hasNonFoil ? (
            <FinishStepper
              label="Normal"
              quantity={owned.normal}
              onChange={(quantity) => step(false, quantity)}
              styles={styles}
            />
          ) : null}
          {hasFoil ? (
            <FinishStepper
              label="Foil"
              quantity={owned.foil}
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
          accessibilityLabel={`Decrease ${label.toLowerCase()} quantity`}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.qty}>{quantity}</Text>
        <Pressable
          onPress={() => onChange(quantity + 1)}
          hitSlop={8}
          style={styles.stepBtn}
          accessibilityLabel={`Increase ${label.toLowerCase()} quantity`}
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
