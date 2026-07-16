import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useCardInventoryQuantities } from "../lib/hooks/useInventoryQuantities";
import { useTheme } from "../lib/theme/ThemeContext";
import { CardPanel } from "./CardPanel";
import { ErrorState } from "./ErrorState";
import { FinishStepper } from "./QuantityStepper";

type Props = {
  cardId: string;
  hasNonFoil: boolean;
  hasFoil: boolean;
};

export function AddToInventory({ cardId, hasNonFoil, hasFoil }: Props) {
  const { colors } = useTheme();
  const { query, owned, step } = useCardInventoryQuantities(cardId);

  return (
    <CardPanel title="In your inventory">
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : query.isError ? (
        // Don't fall through to the steppers: they'd seed from 0, and a tap
        // would upsert an absolute quantity that clobbers the real owned count.
        <ErrorState
          variant="inline"
          message="Couldn’t load your quantities for this card."
          onRetry={() => query.refetch()}
        />
      ) : (
        <View style={styles.rows}>
          {hasNonFoil ? (
            <FinishStepper
              label="Normal"
              quantity={owned.normal}
              onChange={(quantity) => step(false, quantity)}
            />
          ) : null}
          {hasFoil ? (
            <FinishStepper
              label="Foil"
              quantity={owned.foil}
              onChange={(quantity) => step(true, quantity)}
            />
          ) : null}
        </View>
      )}
    </CardPanel>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 8 },
  rows: { gap: 12 },
});
