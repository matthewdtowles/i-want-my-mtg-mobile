// Shared setup for the component suite. Only the native modules the tree
// reaches at import time are stubbed here; anything test-specific (API modules,
// router params) is mocked in the test that needs it.
// React only treats updates as act-wrapped when this is set; without it every
// state update outside render logs "not configured to support act(...)".
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Backed by the iOS keychain / Android keystore — no JS fallback, so it has to
// be faked. In-memory so a test can assert what a sign-in/sign-out persisted.
// The mock module is instantiated once per test file, so the store is cleared
// between tests: a session left behind by one test must not sign the next one in.
const mockSecureStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockSecureStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockSecureStore.delete(k)),
}));
beforeEach(() => mockSecureStore.clear());

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
