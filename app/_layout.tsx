import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../lib/auth/AuthContext";
import { queryClient } from "../lib/queryClient";
import { ThemeProvider, useTheme } from "../lib/theme/ThemeContext";

function RootNavigator() {
  const { initializing, isAuthenticated } = useAuth();
  const { colors, scheme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const onSignIn = segments[0] === "sign-in";
    if (!isAuthenticated && !onSignIn) {
      router.replace("/sign-in");
    } else if (isAuthenticated && onSignIn) {
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
        <Stack.Screen name="set/[code]" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen
          name="card/[setCode]/[number]"
          options={{ headerBackTitle: "Back" }}
        />
        <Stack.Screen name="account" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="notifications" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="price-alerts" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="buy-list" options={{ headerBackTitle: "Back" }} />
        <Stack.Screen name="decks" options={{ headerBackTitle: "Back" }} />
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
        <AuthProvider>
          <SafeAreaProvider>
            <RootNavigator />
          </SafeAreaProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
