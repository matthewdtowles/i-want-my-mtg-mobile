import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import type { Page } from "../../lib/api/catalog";
import { INVENTORY_KEY } from "../../lib/api/inventory";
import { PORTFOLIO_KEY } from "../../lib/api/portfolio";
import {
  TRANSACTIONS_KEY,
  createTransaction,
  updateTransaction,
} from "../../lib/api/transactions";
import type { ApiTransaction } from "../../lib/api/types";
import { ErrorState } from "../../components/ErrorState";
import { firstParam } from "../../lib/params";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

// Local calendar date as YYYY-MM-DD. toISOString() would use UTC, defaulting to
// the wrong day for users whose local date differs from UTC.
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function NewTransactionScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams();

  // Edit mode: an `id` param means we're editing an existing transaction. Only
  // the id travels through the route; the entity comes from the transactions
  // query cache (edit is only reachable from that list, so it's warm). The
  // update API only accepts quantity/price/date/notes — type and finish are
  // immutable — so those controls are locked when editing.
  const editId = firstParam(params.id) ?? "";
  const editing = editId !== "";

  const router = useRouter();
  const queryClient = useQueryClient();

  // Read once on mount: the row can't change underneath this modal, and the
  // form state below must not be re-seeded by a background refetch. The list is
  // cached per page size, so search the TRANSACTIONS_KEY prefix.
  const [tx] = useState<ApiTransaction | undefined>(() =>
    editing
      ? queryClient
          .getQueriesData<InfiniteData<Page<ApiTransaction>>>({
            queryKey: TRANSACTIONS_KEY,
          })
          .flatMap(([, data]) => data?.pages.flatMap((p) => p.items) ?? [])
          .find((t) => String(t.id) === editId)
      : undefined,
  );

  // Create mode gets its card context from the card-detail screen's params.
  const cardId = editing ? tx?.cardId ?? "" : firstParam(params.cardId) ?? "";
  const name = editing ? tx?.cardName ?? "" : firstParam(params.name) ?? "";
  const setCode = editing ? tx?.setCode ?? "" : firstParam(params.setCode) ?? "";
  const number = editing ? tx?.cardNumber ?? "" : firstParam(params.number) ?? "";
  const canBeFoil = firstParam(params.hasFoil) === "true";
  const canBeNonFoil = firstParam(params.hasNonFoil) === "true";

  const [type, setType] = useState<"BUY" | "SELL">(tx?.type === "SELL" ? "SELL" : "BUY");
  const [quantity, setQuantity] = useState(tx ? String(tx.quantity) : "1");
  const [price, setPrice] = useState(tx ? String(tx.pricePerUnit) : "");
  const [isFoil, setIsFoil] = useState(
    tx ? tx.isFoil : canBeFoil && !canBeNonFoil,
  );
  const [date, setDate] = useState(tx?.date || todayLocal());
  const [notes, setNotes] = useState(tx?.notes ?? "");

  // Number() (unlike parseInt/parseFloat) returns NaN for trailing garbage like
  // "1abc" / "1.2.3" instead of truncating; the trim()!=="" guards stop an empty
  // field from coercing to 0.
  const qty = Number(quantity.trim());
  const unitPrice = Number(price.trim());
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
  const valid =
    quantity.trim() !== "" &&
    Number.isInteger(qty) &&
    qty >= 1 &&
    price.trim() !== "" &&
    Number.isFinite(unitPrice) &&
    unitPrice >= 0 &&
    dateValid;

  const mutation = useMutation({
    mutationFn: () =>
      editing
        ? updateTransaction(Number(editId), {
            quantity: qty,
            pricePerUnit: unitPrice,
            date,
            notes: notes.trim() || undefined,
          })
        : createTransaction({
            cardId,
            type,
            quantity: qty,
            pricePerUnit: unitPrice,
            isFoil,
            date,
            notes: notes.trim() || undefined,
          }),
    onSuccess: () => {
      // A transaction adjusts inventory server-side and shifts portfolio totals.
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
      router.back();
    },
    onError: (e) =>
      Alert.alert(
        editing ? "Couldn't update transaction" : "Couldn't log transaction",
        e instanceof Error ? e.message : "Please try again.",
      ),
  });

  function onSubmit() {
    if (!valid) return;
    mutation.mutate();
  }

  // Cache miss (e.g. the entry was gc'd): there's no single-transaction GET to
  // fall back on, so send the user back to the list to reload it.
  if (editing && !tx) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit transaction" }} />
        <ErrorState message="This transaction is no longer available. Go back and try again." />
      </>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: editing ? "Edit transaction" : "Log transaction" }} />

      <Text style={styles.card}>
        {name || cardId}
        {setCode ? `  ${setCode.toUpperCase()}${number ? ` #${number}` : ""}` : ""}
      </Text>

      <View style={styles.typeRow}>
        {(["BUY", "SELL"] as const).map((t) => (
          <Pressable
            key={t}
            style={[
              styles.typeBtn,
              type === t && styles.typeBtnActive,
              editing && type !== t && styles.typeBtnLocked,
            ]}
            onPress={() => setType(t)}
            disabled={editing}
          >
            <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {editing ? (
        <Text style={styles.lockHint}>Type and finish can’t be changed when editing.</Text>
      ) : null}

      <Field label="Quantity" styles={styles}>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          placeholderTextColor={colors.placeholder}
        />
      </Field>

      <Field label="Price per unit (USD)" styles={styles}>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.placeholder}
        />
      </Field>

      {editing ? (
        // Finish is immutable on update, so show it read-only for clarity.
        <View style={styles.switchRow}>
          <Text style={styles.label}>Finish</Text>
          <Text style={styles.readonlyValue}>{isFoil ? "Foil" : "Normal"}</Text>
        </View>
      ) : canBeFoil && canBeNonFoil ? (
        <View style={styles.switchRow}>
          <Text style={styles.label}>Foil</Text>
          <Switch value={isFoil} onValueChange={setIsFoil} />
        </View>
      ) : null}

      <Field label="Date (YYYY-MM-DD)" styles={styles}>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.placeholder}
        />
      </Field>

      <Field label="Notes (optional)" styles={styles}>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholderTextColor={colors.placeholder}
        />
      </Field>

      <Pressable
        style={[styles.submit, (!valid || mutation.isPending) && styles.submitDisabled]}
        onPress={onSubmit}
        disabled={!valid || mutation.isPending}
      >
        <Text style={styles.submitText}>
          {mutation.isPending
            ? "Saving…"
            : editing
              ? "Save changes"
              : `Log ${type.toLowerCase()}`}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background },
    content: { padding: 24, gap: 16, backgroundColor: colors.background },
    card: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
    typeRow: { flexDirection: "row", gap: 12 },
    typeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      alignItems: "center",
    },
    typeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    typeBtnLocked: { opacity: 0.4 },
    typeText: { fontSize: 15, fontWeight: "700", color: colors.textSecondary },
    typeTextActive: { color: colors.onAccent },
    lockHint: { fontSize: 12, color: colors.textMuted, marginTop: -8 },
    field: { gap: 6 },
    label: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },
    readonlyValue: { fontSize: 15, color: colors.textPrimary, fontWeight: "600" },
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
    notes: { minHeight: 72, textAlignVertical: "top" },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    submit: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
  });
