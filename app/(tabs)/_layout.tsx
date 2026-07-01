import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable } from "react-native";

import { HeaderActions } from "../../components/HeaderActions";
import { useTheme } from "../../lib/theme/ThemeContext";

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();

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
        headerRight: () => <HeaderActions />,
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
        name="decks"
        options={{
          title: "Decks",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers" color={color} size={size} />
          ),
          headerRight: () => (
            <HeaderActions
              leading={
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push("/deck/new")}
                  accessibilityLabel="New deck"
                >
                  <Ionicons name="add" size={26} color={colors.accent} />
                </Pressable>
              }
            />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmarks" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
