import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCreatePriceAlert,
  useDeletePriceAlert,
  usePriceAlerts,
} from "../lib/hooks/usePriceAlerts";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";
import { CardPanel } from "./CardPanel";
import { ErrorState } from "./ErrorState";

type Props = { cardId: string };

// Accepts a positive percent like "10" or "7.5"; empty -> undefined (unset);
// zero/negative/non-numeric -> null (invalid).
function parsePct(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null; // invalid
  return n;
}

export function CardPriceAlert({ cardId }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [rise, setRise] = useState("");
  const [fall, setFall] = useState("");

  const query = usePriceAlerts();
  const alert = query.data?.find((a) => a.cardId === cardId);

  const create = useCreatePriceAlert();
  const remove = useDeletePriceAlert();

  function onSet() {
    const increasePct = parsePct(rise);
    const decreasePct = parsePct(fall);
    if (increasePct === null || decreasePct === null) {
      Alert.alert("Enter a valid percent", "Use a number greater than 0, e.g. 10.");
      return;
    }
    if (increasePct === undefined && decreasePct === undefined) {
      Alert.alert("Set a threshold", "Enter a rise or fall percent (or both).");
      return;
    }
    create.mutate(
      { cardId, increasePct, decreasePct },
      {
        onSuccess() {
          setRise("");
          setFall("");
        },
      },
    );
  }

  return (
    <CardPanel title="Price alert">
      {query.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : query.isError ? (
        <ErrorState
          variant="inline"
          message="Couldn't load your price alert for this card."
          onRetry={() => query.refetch()}
        />
      ) : alert ? (
        <View style={styles.rows}>
          {alert.increasePct != null ? (
            <Text style={styles.activeLine}>Rises ≥ {alert.increasePct}%</Text>
          ) : null}
          {alert.decreasePct != null ? (
            <Text style={styles.activeLine}>Falls ≥ {alert.decreasePct}%</Text>
          ) : null}
          {!alert.isActive ? <Text style={styles.paused}>Paused</Text> : null}
          <Pressable
            onPress={() => remove.mutate(alert.id)}
            disabled={remove.isPending}
            style={styles.removeBtn}
            accessibilityRole="button"
          >
            <Text style={styles.removeText}>
              {remove.isPending ? "Removing…" : "Remove alert"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.rows}>
          <Text style={styles.hint}>Notify me when this card&apos;s price moves by at least:</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Rise %</Text>
            <TextInput
              style={styles.input}
              value={rise}
              onChangeText={setRise}
              keyboardType="decimal-pad"
              placeholder="e.g. 10"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Fall %</Text>
            <TextInput
              style={styles.input}
              value={fall}
              onChangeText={setFall}
              keyboardType="decimal-pad"
              placeholder="e.g. 10"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <Pressable
            onPress={onSet}
            disabled={create.isPending}
            style={styles.setBtn}
            accessibilityRole="button"
          >
            <Text style={styles.setText}>{create.isPending ? "Setting…" : "Set alert"}</Text>
          </Pressable>
        </View>
      )}
    </CardPanel>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loading: { marginVertical: 8 },
    rows: { gap: 12 },
    hint: { fontSize: 14, color: colors.textSecondary },
    activeLine: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    paused: { fontSize: 13, color: colors.textMuted },
    field: { gap: 6 },
    label: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    setBtn: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    setText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
    removeBtn: { paddingVertical: 4 },
    removeText: { color: colors.danger, fontSize: 15, fontWeight: "600" },
  });
