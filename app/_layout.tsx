import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../lib/auth/AuthContext";
import { queryClient } from "../lib/queryClient";

function RootNavigator() {
  const { initializing, isAuthenticated } = useAuth();
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

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="set/[code]" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen
        name="card/[setCode]/[number]"
        options={{ headerBackTitle: "Back" }}
      />
      <Stack.Screen name="transaction/new" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
