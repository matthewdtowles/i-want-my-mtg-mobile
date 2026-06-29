import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BUY_LIST_KEY, importBuyList } from "../lib/api/buyList";
import type { ApiBuyListImportResult } from "../lib/api/types";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

export default function BuyListImportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [result, setResult] = useState<ApiBuyListImportResult | null>(null);

  const importMut = useMutation({
    mutationFn: () => importBuyList(text.trim()),
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: BUY_LIST_KEY });
    },
  });

  const canSubmit = text.trim().length > 0 && !importMut.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Import buy-list" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Paste a CSV with a header row:{" "}
          <Text style={styles.mono}>name,set_code,number,quantity,foil</Text>. Moxfield,
          Archidekt, Deckbox, and TCGPlayer exports are auto-detected.
        </Text>

        <TextInput
          style={[styles.input, styles.textarea]}
          value={text}
          onChangeText={setText}
          placeholder={"name,set_code,number,quantity,foil\nLightning Bolt,2x2,117,4,false"}
          placeholderTextColor={colors.placeholder}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />

        {importMut.isError ? (
          <Text style={styles.error}>
            {importMut.error instanceof Error ? importMut.error.message : "Import failed."}
          </Text>
        ) : null}

        {result ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>
              Added {result.saved} card{result.saved === 1 ? "" : "s"} to your buy-list.
            </Text>
            {result.errors.length > 0 ? (
              <>
                <Text style={styles.resultErrLabel}>
                  {result.errors.length} line{result.errors.length === 1 ? "" : "s"} couldn’t be
                  imported:
                </Text>
                {result.errors.map((e, i) => (
                  <Text key={i} style={styles.resultErr}>
                    • {e}
                  </Text>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          onPress={() => importMut.mutate()}
          disabled={!canSubmit}
          accessibilityRole="button"
        >
          <Text style={styles.submitText}>
            {importMut.isPending ? "Importing…" : "Import"}
          </Text>
        </Pressable>

        {result ? (
          <Pressable style={styles.doneBtn} onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    screen: { backgroundColor: colors.background },
    content: { padding: 24, gap: 16 },
    hint: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", color: colors.textPrimary },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    textarea: { minHeight: 180, textAlignVertical: "top" },
    error: { color: colors.danger, fontSize: 14 },
    result: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 6,
    },
    resultTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    resultErrLabel: { fontSize: 13, fontWeight: "600", color: colors.danger, marginTop: 4 },
    resultErr: { fontSize: 13, color: colors.textSecondary },
    submit: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
    doneBtn: { paddingVertical: 10, alignItems: "center" },
    doneText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  });
