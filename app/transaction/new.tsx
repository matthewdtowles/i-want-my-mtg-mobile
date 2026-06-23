import { useMutation, useQueryClient } from "@tanstack/react-query";
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

import { createTransaction } from "../../lib/api/transactions";

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? "";
}

// Local calendar date as YYYY-MM-DD. toISOString() would use UTC, defaulting to
// the wrong day for users whose local date differs from UTC.
function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function NewTransactionScreen() {
  const params = useLocalSearchParams();
  const cardId = one(params.cardId);
  const name = one(params.name);
  const setCode = one(params.setCode);
  const number = one(params.number);
  const canBeFoil = one(params.hasFoil) === "true";
  const canBeNonFoil = one(params.hasNonFoil) === "true";

  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [isFoil, setIsFoil] = useState(canBeFoil && !canBeNonFoil);
  const [date, setDate] = useState(todayLocal);
  const [notes, setNotes] = useState("");

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
    mutationFn: createTransaction,
    onSuccess: () => {
      // A transaction adjusts inventory server-side, so refresh both.
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      router.back();
    },
    onError: (e) =>
      Alert.alert(
        "Couldn't log transaction",
        e instanceof Error ? e.message : "Please try again.",
      ),
  });

  function onSubmit() {
    if (!valid) return;
    mutation.mutate({
      cardId,
      type,
      quantity: qty,
      pricePerUnit: unitPrice,
      isFoil,
      date,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Log transaction" }} />

      <Text style={styles.card}>
        {name || cardId}
        {setCode ? `  ${setCode.toUpperCase()}${number ? ` #${number}` : ""}` : ""}
      </Text>

      <View style={styles.typeRow}>
        {(["BUY", "SELL"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Quantity">
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
      </Field>

      <Field label="Price per unit (USD)">
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
      </Field>

      {canBeFoil && canBeNonFoil ? (
        <View style={styles.switchRow}>
          <Text style={styles.label}>Foil</Text>
          <Switch value={isFoil} onValueChange={setIsFoil} />
        </View>
      ) : null}

      <Field label="Date (YYYY-MM-DD)">
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      <Field label="Notes (optional)">
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </Field>

      <Pressable
        style={[styles.submit, (!valid || mutation.isPending) && styles.submitDisabled]}
        onPress={onSubmit}
        disabled={!valid || mutation.isPending}
      >
        <Text style={styles.submitText}>
          {mutation.isPending ? "Saving…" : `Log ${type.toLowerCase()}`}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16 },
  card: { fontSize: 17, fontWeight: "700" },
  typeRow: { flexDirection: "row", gap: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: "#6d28d9", borderColor: "#6d28d9" },
  typeText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  typeTextActive: { color: "#fff" },
  field: { gap: 6 },
  label: { fontSize: 14, color: "#374151", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  notes: { minHeight: 72, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  submit: {
    backgroundColor: "#6d28d9",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
