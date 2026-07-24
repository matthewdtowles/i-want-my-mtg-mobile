import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

/**
 * Shown in place of an auth-only screen (or section) while signed out, now that
 * browsing is public. Explains what signing in unlocks and offers both paths.
 */
export function SignInPrompt({
  title = "Sign in to continue",
  message,
}: {
  title?: string;
  message: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle-outline" size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/sign-in")}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/sign-up")} accessibilityRole="button">
        <Text style={styles.link}>Create an account</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      gap: 8,
      backgroundColor: colors.background,
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    message: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    button: {
      marginTop: 12,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 40,
    },
    buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: "600" },
    link: { color: colors.accent, fontWeight: "600", marginTop: 8, fontSize: 14 },
  });
