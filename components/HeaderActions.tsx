import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { NotificationBell } from "./NotificationBell";
import { useTheme } from "../lib/theme/ThemeContext";

/**
 * Shared top-right header cluster (notification bell + account) used on every
 * tab. `leading` lets a tab prepend a screen-specific action (e.g. New deck).
 */
export function HeaderActions({ leading }: { leading?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
      }}
    >
      {leading}
      <NotificationBell />
      <Link href="/account" asChild>
        <Pressable hitSlop={12} accessibilityLabel="Account and settings">
          <Ionicons name="person-circle-outline" size={26} color={colors.accent} />
        </Pressable>
      </Link>
    </View>
  );
}
