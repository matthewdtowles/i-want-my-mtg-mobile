import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NotificationBell } from "./NotificationBell";
import { useAuth } from "../lib/auth/AuthContext";
import { useTheme } from "../lib/theme/ThemeContext";

/**
 * Shared top-right header cluster used on every tab. `leading` lets a tab
 * prepend a screen-specific action (e.g. New deck). Signed in it shows the
 * notification bell + account; signed out (browsing is public) it shows
 * settings + a sign-in button instead.
 */
export function HeaderActions({ leading }: { leading?: ReactNode }) {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  return (
    <View style={styles.row}>
      {leading}
      {isAuthenticated ? (
        <>
          <NotificationBell />
          <Link href="/account" asChild>
            <Pressable hitSlop={12} accessibilityLabel="Account and settings">
              <Ionicons name="person-circle-outline" size={26} color={colors.accent} />
            </Pressable>
          </Link>
        </>
      ) : (
        <>
          <Link href="/settings" asChild>
            <Pressable hitSlop={12} accessibilityLabel="Settings">
              <Ionicons name="settings-outline" size={22} color={colors.accent} />
            </Pressable>
          </Link>
          <Link href="/sign-in" asChild>
            <Pressable hitSlop={12} accessibilityRole="button">
              <Text style={[styles.signIn, { color: colors.accent }]}>Sign in</Text>
            </Pressable>
          </Link>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
  },
  signIn: { fontSize: 15, fontWeight: "600" },
});
