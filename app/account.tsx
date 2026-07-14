import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "../lib/api/config";
import { USER_PROFILE_KEY, deleteAccount, fetchProfile } from "../lib/api/user";
import { useAuth } from "../lib/auth/AuthContext";
import { useTheme, type ThemeMode } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

const PRIVACY_URL = `${API_BASE_URL}/privacy`;

const APPEARANCE: { label: string; value: ThemeMode }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export default function AccountScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut } = useAuth();

  const profile = useQuery({ queryKey: USER_PROFILE_KEY, queryFn: fetchProfile });

  const remove = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      // The token is now invalid server-side; signOut() drops the local session
      // and clears all query caches (see AuthContext.handleSignedOut).
      await signOut();
    },
    onError: (e) =>
      Alert.alert(
        "Couldn't delete account",
        e instanceof Error ? e.message : "Please try again.",
      ),
  });

  function confirmSignOut() {
    Alert.alert("Sign out", "Sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account, inventory, transactions, and decks. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            // Second confirmation for an irreversible, destructive action.
            Alert.alert("Are you sure?", "There is no way to recover your data.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete forever",
                style: "destructive",
                onPress: () => remove.mutate(),
              },
            ]),
        },
      ],
    );
  }

  const version = Constants.expoConfig?.version ?? "—";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Account" }} />

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        {profile.isPending ? (
          <ActivityIndicator style={styles.loading} color={colors.accent} />
        ) : profile.isError ? (
          <Text style={styles.errorText}>
            {profile.error instanceof Error
              ? profile.error.message
              : "Couldn't load your account."}
          </Text>
        ) : (
          <>
            {profile.data.name ? (
              <Text style={styles.accountName}>{profile.data.name}</Text>
            ) : null}
            <Text style={styles.accountEmail}>{profile.data.email}</Text>
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.segment}>
        {APPEARANCE.map((opt) => {
          const active = mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setMode(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>ACTIONS</Text>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={confirmSignOut}
        accessibilityRole="button"
      >
        <Text style={styles.rowText}>Sign out</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => {
          WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => {
            Alert.alert("Couldn't open the browser", "Please try again.");
          });
        }}
        accessibilityRole="button"
      >
        <Text style={styles.rowText}>Privacy policy</Text>
        <Text style={styles.rowHint}>Web ›</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={confirmDelete}
        disabled={remove.isPending}
        accessibilityRole="button"
      >
        <Text style={[styles.rowText, styles.danger]}>
          {remove.isPending ? "Deleting…" : "Delete account"}
        </Text>
      </Pressable>

      <Text style={styles.version}>Version {version}</Text>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background },
    content: { padding: 20, gap: 8 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      marginTop: 16,
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      padding: 16,
    },
    loading: { marginVertical: 4 },
    errorText: { color: colors.danger, fontSize: 14 },
    accountName: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
    accountEmail: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
    segment: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      overflow: "hidden",
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    segmentBtnActive: { backgroundColor: colors.accent },
    segmentText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    segmentTextActive: { color: colors.onAccent },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    rowPressed: { backgroundColor: colors.surfaceAlt },
    rowText: { fontSize: 16, color: colors.textPrimary },
    rowHint: { fontSize: 14, color: colors.textMuted },
    danger: { color: colors.danger, fontWeight: "600" },
    version: {
      textAlign: "center",
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 20,
    },
  });
