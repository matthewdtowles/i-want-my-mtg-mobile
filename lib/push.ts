import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerDevice, unregisterDevice, type DevicePlatform } from "./api/devices";

// Show a banner + play a sound when a push arrives while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The Expo push token we last registered, so sign-out can unregister it.
let registeredToken: string | null = null;

function pushPlatform(): DevicePlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

// Requests permission (if needed) and returns the Expo push token, or null when
// unavailable: a simulator/emulator, Expo Go (no remote push), denied
// permission, or a missing EAS projectId.
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.status === "granted";
    if (!granted) {
      granted = (await Notifications.requestPermissionsAsync()).status === "granted";
    }
    if (!granted) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

// Best-effort: get a token and register it with the backend. Silently no-ops
// where push isn't available; the backend prunes dead tokens on send failure.
export async function registerPushDevice(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  registeredToken = token;
  try {
    await registerDevice(token, pushPlatform());
  } catch {
    // ignore - non-critical, retried on next app start
  }
}

// Best-effort unregister; call while the session token is still valid (i.e.
// before sign-out clears it).
export async function unregisterPushDevice(): Promise<void> {
  const token = registeredToken;
  if (!token) return;
  registeredToken = null;
  try {
    await unregisterDevice(token);
  } catch {
    // ignore
  }
}
