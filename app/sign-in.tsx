import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth/AuthContext";
import { API_BASE_URL } from "../lib/api/config";
import { useTheme } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

// No API signup endpoint exists (registration needs email verification, which
// is handled by the web app), so sign-up opens the web registration page.
const SIGN_UP_URL = `${API_BASE_URL}/user/create`;

export default function SignInScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signIn, sessionExpired } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSignIn() {
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Routing to the tabs is handled by the root navigator on auth change.
    } catch (err) {
      Alert.alert(
        "Sign in failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/icon.png")}
          style={styles.logo}
          accessibilityLabel="I Want My MTG logo"
        />
        <Text style={styles.title}>I Want My MTG</Text>
        <Text style={styles.subtitle}>Sign in to your collection</Text>
      </View>

      {sessionExpired ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Your session expired. Please sign in again.
          </Text>
        </View>
      ) : null}

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
        onSubmitEditing={() => canSubmit && onSignIn()}
      />

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={onSignIn}
        disabled={!canSubmit}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>New here? </Text>
        <Pressable
          onPress={() => {
            WebBrowser.openBrowserAsync(SIGN_UP_URL).catch(() => {
              Alert.alert("Couldn't open the browser", "Please try again.");
            });
          }}
        >
          <Text style={styles.signupLink}>Create an account</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      gap: 16,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    logo: {
      width: 96,
      height: 96,
      borderRadius: 20,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textMuted,
    },
    notice: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
    },
    noticeText: {
      color: colors.textSecondary,
      fontSize: 14,
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
    signupRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 8,
    },
    signupText: {
      color: colors.textMuted,
    },
    signupLink: {
      color: colors.accent,
      fontWeight: "600",
    },
  });
