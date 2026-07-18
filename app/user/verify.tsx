import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../lib/auth/AuthContext";
import { useTheme, useThemedStyles } from "../../lib/theme/ThemeContext";
import type { ThemeColors } from "../../lib/theme/colors";

/**
 * Landing route for the emailed verification link. iOS Universal Links (and the
 * iwantmymtg:// scheme) route `/user/verify?token=...` here; we exchange the
 * token for a session, which flips the app into its authenticated state.
 */
export default function VerifyScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { verifyEmail } = useAuth();
  const router = useRouter();
  // Repeated query params surface as string[]; take the first value.
  const { token: rawToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // Params can be undefined on the first render and arrive shortly after, so
  // derive the missing-token error at render time rather than freezing it at init.
  const error =
    verifyError ?? (token ? null : "This verification link is missing its token.");
  // Guard against re-running the (single-use) token exchange on re-render.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !token) return;
    attempted.current = true;
    verifyEmail(token).catch((err) => {
      setVerifyError(err instanceof Error ? err.message : "Verification failed.");
    });
    // On success the root navigator routes to the authenticated tabs.
  }, [token, verifyEmail]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Verifying", headerShown: false }} />
      {error ? (
        <>
          <Text style={styles.title}>Verification failed</Text>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.button} onPress={() => router.replace("/sign-in")}>
            <Text style={styles.buttonText}>Back to sign in</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.message}>Verifying your account…</Text>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 24,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    message: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "600",
    },
  });
