import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DECKS_KEY, createDeck, deckKey, importDeck, updateDeck } from "../../lib/api/decks";
import type { DeckFormat } from "../../lib/api/types";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

const FORMATS: DeckFormat[] = [
  "standard",
  "commander",
  "modern",
  "legacy",
  "vintage",
  "brawl",
  "explorer",
  "historic",
  "oathbreaker",
  "pauper",
  "pioneer",
];

type Mode = "create" | "import";

export default function NewDeckScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{ id?: string; name?: string; format?: string }>();
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const editId = params.id ? Number(str(params.id)) : null;
  const isEdit = editId !== null && Number.isFinite(editId);

  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState(() => str(params.name));
  const [format, setFormat] = useState<DeckFormat | null>(() => {
    const f = str(params.format) as DeckFormat;
    return FORMATS.includes(f) ? f : null;
  });
  const [text, setText] = useState("");

  function goToDeck(id: number) {
    queryClient.invalidateQueries({ queryKey: DECKS_KEY });
    // Replace so the modal doesn't sit behind the deck in the back stack.
    router.replace(`/deck/${id}`);
  }

  const create = useMutation({
    mutationFn: () => createDeck({ name: name.trim(), format: format ?? undefined }),
    onSuccess: (deck) => goToDeck(deck.id),
    onError: (e) =>
      Alert.alert("Couldn't create deck", e instanceof Error ? e.message : "Please try again."),
  });

  const importMut = useMutation({
    mutationFn: () =>
      importDeck({ name: name.trim(), format: format ?? undefined, text: text.trim() }),
    onSuccess: (result) => {
      if (result.errors.length > 0) {
        Alert.alert(
          "Imported with issues",
          `${result.saved} card${result.saved === 1 ? "" : "s"} added; ${result.errors.length} line${result.errors.length === 1 ? "" : "s"} couldn't be resolved.`,
        );
      }
      goToDeck(result.deckId);
    },
    onError: (e) =>
      Alert.alert("Couldn't import deck", e instanceof Error ? e.message : "Please try again."),
  });

  const update = useMutation({
    mutationFn: () => updateDeck(editId!, { name: name.trim(), format: format ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deckKey(editId!) });
      queryClient.invalidateQueries({ queryKey: DECKS_KEY });
      router.back();
    },
    onError: (e) =>
      Alert.alert("Couldn't save deck", e instanceof Error ? e.message : "Please try again."),
  });

  const busy = create.isPending || importMut.isPending || update.isPending;
  const canSubmit =
    name.trim().length > 0 &&
    (isEdit || mode === "create" || text.trim().length > 0) &&
    !busy;

  function onSubmit() {
    if (isEdit) update.mutate();
    else if (mode === "create") create.mutate();
    else importMut.mutate();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: isEdit ? "Edit deck" : "New deck" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {!isEdit ? (
          <View style={styles.segment}>
            {(["create", "import"] as Mode[]).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setMode(m)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {m === "create" ? "Create empty" : "Import list"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="My deck"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Format</Text>
          <View style={styles.chips}>
            <Chip label="None" active={format === null} onPress={() => setFormat(null)} styles={styles} />
            {FORMATS.map((f) => (
              <Chip
                key={f}
                label={f[0].toUpperCase() + f.slice(1)}
                active={format === f}
                onPress={() => setFormat(f)}
                styles={styles}
              />
            ))}
          </View>
        </View>

        {!isEdit && mode === "import" ? (
          <View style={styles.field}>
            <Text style={styles.label}>Decklist</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={text}
              onChangeText={setText}
              placeholder={"4 Lightning Bolt\n2 Counterspell\n..."}
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <Text style={styles.hint}>One entry per line, e.g. “4 Lightning Bolt”.</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
        >
          <Text style={styles.submitText}>
            {busy
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : mode === "create"
                  ? "Create deck"
                  : "Import deck"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    screen: { backgroundColor: colors.background },
    content: { padding: 24, gap: 16 },
    segment: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      overflow: "hidden",
    },
    segmentBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: colors.surface },
    segmentBtnActive: { backgroundColor: colors.accent },
    segmentText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    segmentTextActive: { color: colors.onAccent },
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
    textarea: { minHeight: 140, textAlignVertical: "top" },
    hint: { fontSize: 12, color: colors.textMuted },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.surface,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },
    chipTextActive: { color: colors.onAccent },
    submit: {
      marginTop: 4,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
  });
