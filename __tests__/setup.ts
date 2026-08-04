// Shared setup for the component suite. Only the native modules the tree
// reaches at import time are stubbed here; anything test-specific (API modules,
// router params) is mocked in the test that needs it.
// React only treats updates as act-wrapped when this is set; without it every
// state update outside render logs "not configured to support act(...)".
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Backed by the iOS keychain / Android keystore — no JS fallback, so it has to
// be faked. In-memory so a test can assert what a sign-in/sign-out persisted.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

// Icons pull in expo-font's asset loader, which needs a native asset registry.
// They are decorative here — every icon button carries its own
// accessibilityLabel on the Pressable — so an empty view is enough.
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return new Proxy({}, { get: () => View });
});

// Push registration talks to the notification service and the API on import.
jest.mock("../lib/push", () => ({
  registerPushDevice: jest.fn(async () => {}),
  unregisterPushDevice: jest.fn(async () => {}),
}));
