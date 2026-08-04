/**
 * Branch coverage for the Browse screen — which subtree renders for a given
 * combination of auth state and query state. #92 was a bug in exactly that
 * combination, so these are the states worth pinning: loading, error, empty,
 * signed-out, and signed-in.
 */
import { waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import BrowseScreen from "../app/(tabs)/index";
import { fetchSets } from "../lib/api/catalog";
import { renderScreen } from "./support/renderScreen";

jest.mock("expo-router", () => {
  const { View } = require("react-native");
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    Link: ({ children }: { children: ReactNode }) => <View>{children}</View>,
  };
});

let mockAuthenticated = false;
jest.mock("../lib/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: mockAuthenticated, initializing: false }),
}));

jest.mock("../lib/api/catalog", () => ({
  ...jest.requireActual("../lib/api/catalog"),
  fetchSets: jest.fn(),
  searchCards: jest.fn(),
}));

// The signed-in header renders the collection summary, which fetches on its own.
jest.mock("../components/CollectionHero", () => {
  const { Text } = require("react-native");
  return { CollectionHero: () => <Text>Collection hero</Text> };
});

const sets = fetchSets as jest.Mock;

const page = (items: { code: string; name: string }[]) => ({
  items,
  meta: { page: 1, totalPages: 1 },
});

beforeEach(() => {
  mockAuthenticated = false;
  sets.mockReset();
});

test("signed out: every set renders, with no collection hero", async () => {
  sets.mockResolvedValue(
    page([
      { code: "blb", name: "Bloomburrow" },
      { code: "otj", name: "Outlaws of Thunder Junction" },
    ]),
  );

  const screen = await renderScreen(<BrowseScreen />);

  // The first set is in the list, not consumed by a hero slot above it — the
  // shape of the #92 regression.
  await waitFor(() => expect(screen.getByText("Bloomburrow")).toBeTruthy());
  expect(screen.getByText("Outlaws of Thunder Junction")).toBeTruthy();
  expect(screen.queryByText("Collection hero")).toBeNull();
});

test("signed in: the collection hero sits above the same full set list", async () => {
  mockAuthenticated = true;
  sets.mockResolvedValue(page([{ code: "blb", name: "Bloomburrow" }]));

  const screen = await renderScreen(<BrowseScreen />);

  await waitFor(() => expect(screen.getByText("Bloomburrow")).toBeTruthy());
  expect(screen.getByText("Collection hero")).toBeTruthy();
});

test("no sets match: the empty state renders instead of a blank list", async () => {
  sets.mockResolvedValue(page([]));

  const screen = await renderScreen(<BrowseScreen />);

  await waitFor(() =>
    expect(screen.getByText("No sets match your search.")).toBeTruthy(),
  );
});

test("a failed fetch renders the error message, not an empty gallery", async () => {
  sets.mockRejectedValue(new Error("Sets are unavailable."));

  const screen = await renderScreen(<BrowseScreen />);

  await waitFor(() => expect(screen.getByText("Sets are unavailable.")).toBeTruthy());
  expect(screen.queryByText("No sets match your search.")).toBeNull();
});
