/**
 * Regression: #92 — toggling a set page from binder (grid) to list crashed the
 * app. Both branches rendered a `<FlatList>` at the same position in the tree,
 * so React reused the instance and flipped `numColumns` 3 → undefined, tripping
 * RN's "Changing numColumns on the fly is not supported" invariant. The fix is
 * a distinct `key` per view, which forces a remount.
 *
 * Revert check: remove `key="list"` / `key="grid"` in `app/set/[code].tsx` →
 * this test fails with that invariant.
 */
import { fireEvent, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import SetDetailScreen from "../app/set/[code]";
import { renderScreen } from "./support/renderScreen";

// `Stack.Screen` is a no-op outside a navigator, so the header's view-toggle
// button would never render. Render `headerRight()` inline instead — it is the
// only way to press the control that caused the crash.
jest.mock("expo-router", () => {
  const { View } = require("react-native");
  return {
    useLocalSearchParams: () => ({ code: "blb" }),
    Stack: {
      Screen: ({ options }: { options?: { headerRight?: () => ReactNode } }) => (
        <View>{options?.headerRight?.() ?? null}</View>
      ),
    },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    Link: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("../lib/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, initializing: false }),
}));

jest.mock("../lib/api/catalog", () => {
  const actual = jest.requireActual("../lib/api/catalog");
  return {
    ...actual,
    fetchSet: jest.fn(async () => ({
      code: "blb",
      name: "Bloomburrow",
      isMain: true,
      baseSize: 3,
      totalSize: 3,
    })),
    fetchSetCards: jest.fn(async () => ({
      items: ["1", "2", "3"].map((id) => ({
        id,
        name: `Card ${id}`,
        number: id,
        setCode: "blb",
        rarity: "common",
        hasFoil: true,
        hasNonFoil: true,
      })),
      meta: { page: 1, totalPages: 1 },
    })),
  };
});

test("toggling binder → list → binder does not trip the numColumns invariant", async () => {
  const screen = await renderScreen(<SetDetailScreen />);

  // The binder grid renders each card as an art tile labelled with its name.
  await waitFor(() => expect(screen.getByLabelText("Card 1")).toBeTruthy());

  // Grid → list. Before the fix this threw during the re-render.
  await fireEvent.press(screen.getByLabelText("Switch to list view"));
  await waitFor(() => expect(screen.getByLabelText("Switch to binder view")).toBeTruthy());
  // The list view spells the name out as text, so this also proves the list
  // actually mounted rather than the screen surviving empty.
  expect(screen.getByText("Card 1")).toBeTruthy();

  // And back, which is the same invariant in the other direction.
  await fireEvent.press(screen.getByLabelText("Switch to binder view"));
  await waitFor(() => expect(screen.getByLabelText("Switch to list view")).toBeTruthy());
  expect(screen.getByLabelText("Card 1")).toBeTruthy();
});
