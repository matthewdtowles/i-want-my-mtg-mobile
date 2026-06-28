import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNotifications } from "../lib/useNotifications";
import { useTheme } from "../lib/theme/ThemeContext";

export function NotificationBell() {
  const { colors } = useTheme();
  const { unread } = useNotifications();

  return (
    <Link href="/notifications" asChild>
      <Pressable
        hitSlop={12}
        style={styles.button}
        accessibilityLabel={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
      >
        <Ionicons name="notifications-outline" size={24} color={colors.accent} />
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 4, paddingVertical: 2 },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
