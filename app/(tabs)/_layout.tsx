import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable } from "react-native";

import { useAuth } from "../../lib/auth/AuthContext";
import { useTheme } from "../../lib/theme/ThemeContext";

export default function TabsLayout() {
  const { signOut } = useAuth();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary },
        headerRight: () => (
          <Pressable
            onPress={() => signOut()}
            hitSlop={12}
            style={{ paddingHorizontal: 16 }}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={24} color={colors.accent} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Portfolio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
