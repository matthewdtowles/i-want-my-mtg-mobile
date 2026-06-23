import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchQuantities, saveInventory } from "../lib/api/inventory";
import type { ApiInventoryQuantity } from "../lib/api/types";

type Props = {
  cardId: string;
  hasNonFoil: boolean;
  hasFoil: boolean;
};

function qtyKey(cardId: string) {
  return ["inventory", "quantities", cardId] as const;
}

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
  const queryClient = useQueryClient();
  const key = qtyKey(cardId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchQuantities([cardId]),
  });

  const setQty = useMutation({
    mutationFn: ({ isFoil, quantity }: { isFoil: boolean; quantity: number }) =>
      saveInventory([{ cardId, quantity, isFoil }]),
    async onMutate({ isFoil, quantity }) {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ApiInventoryQuantity[]>(key);
      queryClient.setQueryData<ApiInventoryQuantity[]>(key, (old) =>
        upsertQty(old, cardId, isFoil, quantity),
      );
      return { previous };
    },
    onError(_err, _vars, ctx) {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    // Keep the inventory list in sync with edits made here.
    onSettled() {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const owned = readQty(query.data, cardId);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>In your inventory</Text>
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <View style={styles.rows}>
          {hasNonFoil ? (
            <FinishStepper
              label="Normal"
              quantity={owned.normal}
              onChange={(quantity) => setQty.mutate({ isFoil: false, quantity })}
            />
          ) : null}
          {hasFoil ? (
            <FinishStepper
              label="Foil"
              quantity={owned.foil}
              onChange={(quantity) => setQty.mutate({ isFoil: true, quantity })}
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
}: {
  label: string;
  quantity: number;
  onChange: (quantity: number) => void;
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

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  heading: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  loading: { marginVertical: 8 },
  rows: { gap: 12 },
  finishRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  finishLabel: { fontSize: 15, color: "#374151" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepText: { fontSize: 20, color: "#374151" },
  qty: { fontSize: 17, fontWeight: "600", minWidth: 24, textAlign: "center" },
});
