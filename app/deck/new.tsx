import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

import {
  DECKS_KEY,
  createDeck,
  deckKey,
  fetchDeck,
  importDeck,
  updateDeck,
} from "../../lib/api/decks";
import type { ApiDeckDetail, DeckFormat } from "../../lib/api/types";
import { Chip } from "../../components/Chip";
import { ErrorState } from "../../components/ErrorState";
import { SegmentedControl } from "../../components/SegmentedControl";
import { formatDeckFormat } from "../../lib/format";
import { firstParam } from "../../lib/params";
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

  // Edit mode: only the id travels through the route; the deck comes from the
  // query cache (warm when arriving from the deck screen) with a fetch
  // fallback, instead of param-packing name/format.
  const params = useLocalSearchParams<{ id?: string }>();
  const editIdRaw = firstParam(params.id);
  const editId = editIdRaw ? Number(editIdRaw) : null;
  const isEdit = editId !== null && Number.isFinite(editId);

  const deckQuery = useQuery({
    queryKey: deckKey(editId ?? -1),
    queryFn: () => fetchDeck(editId ?? -1),
    enabled: isEdit,
  });

  if (!isEdit) {
    return <DeckForm />;
  }
  if (deckQuery.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit deck" }} />
        <ActivityIndicator style={styles.center} size="large" color={colors.accent} />
      </>
    );
  }
  if (deckQuery.isError) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit deck" }} />
        <ErrorState
          message={
            deckQuery.error instanceof Error ? deckQuery.error.message : "Failed to load deck."
          }
          onRetry={() => deckQuery.refetch()}
        />
      </>
    );
  }
  return <DeckForm deck={deckQuery.data} />;
}

function DeckForm({ deck }: { deck?: ApiDeckDetail }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = deck != null;

  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState(deck?.name ?? "");
  const [format, setFormat] = useState<DeckFormat | null>(() => {
    const f = deck?.format as DeckFormat | undefined;
    return f && FORMATS.includes(f) ? f : null;
  });
  const [text, setText] = useState("");

  function goToDeck(id: number) {
    queryClient.invalidateQueries({ queryKey: DECKS_KEY });
    // Replace so the modal doesn't sit behind the deck in the back stack.
    router.replace(`/deck/${id}`);
  }

  const create = useMutation({
    mutationFn: () => createDeck({ name: name.trim(), format: format ?? undefined }),
    onSuccess: (created) => goToDeck(created.id),
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
    mutationFn: () => updateDeck(deck!.id, { name: name.trim(), format: format ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deckKey(deck!.id) });
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
          <SegmentedControl
            options={[
              { label: "Create empty", value: "create" },
              { label: "Import list", value: "import" },
            ]}
            value={mode}
            onChange={setMode}
            size="large"
          />
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
            <Chip label="None" active={format === null} onPress={() => setFormat(null)} size="large" />
            {FORMATS.map((f) => (
              <Chip
                key={f}
                label={formatDeckFormat(f)}
                active={format === f}
                onPress={() => setFormat(f)}
                size="large"
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    screen: { backgroundColor: colors.background },
    content: { padding: 24, gap: 16 },
    center: { marginTop: 40 },
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
