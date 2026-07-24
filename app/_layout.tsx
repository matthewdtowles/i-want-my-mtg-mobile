import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../lib/auth/AuthContext";
import { queryClient } from "../lib/queryClient";
import { SettingsProvider } from "../lib/settings/SettingsContext";
import { ThemeProvider, useTheme } from "../lib/theme/ThemeContext";
import { usePushNotifications } from "../lib/usePushNotifications";

function RootNavigator() {
  const { initializing, isAuthenticated } = useAuth();
  const { colors, scheme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  usePushNotifications(isAuthenticated);

  useEffect(() => {
    if (initializing) return;
    // Browsing (sets, cards, search) is public. Only account-scoped stack
    // routes force sign-in; the auth-only tabs render their own inline
    // sign-in prompt instead so the tab bar stays usable while signed out.
    const route = segments.join("/");
    const onProtectedRoute =
      segments[0] === "account" ||
      segments[0] === "notifications" ||
      segments[0] === "portfolio" ||
      segments[0] === "transactions" ||
      segments[0] === "transaction" ||
      segments[0] === "buy-list-import" ||
      segments[0] === "deck";
    const onAuthEntryRoute =
      segments[0] === "sign-in" ||
      segments[0] === "sign-up" ||
      route === "user/verify";
    if (!isAuthenticated && onProtectedRoute) {
      router.replace("/sign-in");
    } else if (isAuthenticated && onAuthEntryRoute) {
      // Covers post-verification: once verify-email lands a session, leave the
      // auth entry route for the tabs.
      router.replace("/");
    }
  }, [initializing, isAuthenticated, segments, router]);

  // Render the themed status bar in every state (including the cold-start
  // loader) so its style is correct from the first frame in dark mode.
  const statusBar = <StatusBar style={scheme === "dark" ? "light" : "dark"} />;

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        {statusBar}
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="user/verify" options={{ headerShown: false }} />
        <Stack.Screen name="set/[code]" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen
          name="card/[setCode]/[number]"
          options={{ headerBackTitle: "Back" }}
        />
        <Stack.Screen name="account" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="settings" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="privacy" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="notifications" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen
          name="portfolio"
          options={{ title: "Portfolio", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="transactions"
          options={{ title: "Transactions", headerBackTitle: "Back" }}
        />
        <Stack.Screen name="buy-list-import" options={{ presentation: "modal" }} />
        <Stack.Screen name="deck/[id]" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="deck/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="deck/add" options={{ presentation: "modal" }} />
        <Stack.Screen name="transaction/new" options={{ presentation: "modal" }} />
      </Stack>
      {statusBar}
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <AuthProvider>
            <SafeAreaProvider>
              <RootNavigator />
            </SafeAreaProvider>
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
