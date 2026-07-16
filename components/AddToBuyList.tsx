import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useBuyList, useBuyListQuantity, wantedQuantity } from "../lib/hooks/useBuyList";
import { useTheme } from "../lib/theme/ThemeContext";
import { CardPanel } from "./CardPanel";
import { ErrorState } from "./ErrorState";
import { FinishStepper } from "./QuantityStepper";

type Props = {
  cardId: string;
  hasNonFoil: boolean;
  hasFoil: boolean;
};

export function AddToBuyList({ cardId, hasNonFoil, hasFoil }: Props) {
  const { colors } = useTheme();
  const query = useBuyList();
  const { set } = useBuyListQuantity();

  return (
    <CardPanel title="On your buy-list">
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : query.isError ? (
        <ErrorState
          variant="inline"
          message="Couldn’t load your buy-list for this card."
          onRetry={() => query.refetch()}
        />
      ) : (
        <View style={styles.rows}>
          {hasNonFoil ? (
            <FinishStepper
              label="Normal"
              quantity={wantedQuantity(query.data, cardId, false)}
              onChange={(quantity) => set(cardId, false, quantity)}
              subjectSuffix="buy-list quantity"
            />
          ) : null}
          {hasFoil ? (
            <FinishStepper
              label="Foil"
              quantity={wantedQuantity(query.data, cardId, true)}
              onChange={(quantity) => set(cardId, true, quantity)}
              subjectSuffix="buy-list quantity"
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
