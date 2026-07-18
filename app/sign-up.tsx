import { Stack, useRouter } from "expo-router";
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

import { register } from "../lib/auth/signUpRequest";
import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

export default function SignUpScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    !submitting;

  async function onSubmit() {
    setSubmitting(true);
    try {
      await register(email.trim(), name.trim(), password);
      setSent(true);
    } catch (err) {
      Alert.alert(
        "Couldn't create account",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Check your email" }} />
        <View style={styles.sentBody}>
          <Text style={styles.sentTitle}>Check your email</Text>
          <Text style={styles.sentText}>
            We sent a verification link to{"\n"}
            <Text style={styles.sentEmail}>{email.trim()}</Text>.
          </Text>
          <Text style={styles.sentText}>
            Open it on this device to finish setting up your account.
          </Text>
        </View>
        <Pressable style={styles.button} onPress={() => router.replace("/sign-in")}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Create account" }} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoComplete="username"
          value={name}
          onChangeText={setName}
          editable={!submitting}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          value={email}
          onChangeText={setEmail}
          editable={!submitting}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
        />
        <Text style={styles.hint}>
          Name is 6–50 characters. Password needs 8+ characters with an
          uppercase, lowercase, number, and symbol.
        </Text>

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace("/sign-in")}>
            <Text style={styles.signinLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      padding: 24,
      gap: 16,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
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
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: -4,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "600",
    },
    signinRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 8,
    },
    signinText: {
      color: colors.textMuted,
    },
    signinLink: {
      color: colors.accent,
      fontWeight: "600",
    },
    sentBody: {
      flex: 1,
      justifyContent: "center",
      gap: 16,
    },
    sentTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    sentText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    sentEmail: {
      fontWeight: "700",
      color: colors.textPrimary,
    },
  });
