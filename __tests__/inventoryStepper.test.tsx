/**
 * Regression: MB3 (6ad58da) — the quantity steppers wrote once per tap, so
 * "+ + +" fired three independent absolute-quantity requests that could land
 * out of order and leave the server behind the UI; and a failed write rolled
 * the cache back silently, so the number simply moved back with no explanation.
 *
 * Revert checks:
 *  - drop the `useDebouncedByKey` wrapper in `lib/hooks/useInventoryQuantities.ts`
 *    (call `setQty.mutate` directly) → the coalescing test fails with 3 calls.
 *  - drop the `Alert.alert(...)` in `useOptimisticMutation`'s `onError`
 *    → the alert test fails.
 */
import { fireEvent, waitFor } from "@testing-library/react-native";
import { act } from "react";
import { Alert } from "react-native";

import { AddToInventory } from "../components/AddToInventory";
import { INVENTORY_KEY, saveInventory } from "../lib/api/inventory";
import { renderScreen } from "./support/renderScreen";

jest.mock("../lib/api/inventory", () => {
  const actual = jest.requireActual("../lib/api/inventory");
  return {
    ...actual,
    fetchQuantities: jest.fn(async () => [
      { cardId: "c1", normalQuantity: 0, foilQuantity: 0 },
    ]),
    saveInventory: jest.fn(async () => {}),
  };
});

const save = saveInventory as jest.Mock;

/** Debounce delay in `useDebouncedByKey`, plus a margin. */
const DEBOUNCE_MS = 400;

beforeEach(() => {
  jest.useFakeTimers();
  save.mockClear();
  save.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderPanel() {
  const screen = await renderScreen(
    <AddToInventory cardId="c1" hasNonFoil hasFoil={false} />,
  );
  await waitFor(() => expect(screen.getByLabelText("Increase normal quantity")).toBeTruthy());
  return screen;
}

/**
 * A tap, plus the 1ms it takes react-query to notify subscribers — under fake
 * timers that batch is a pending timer, so without this the tree never sees the
 * optimistic cache write and the next tap would re-send the same quantity.
 */
async function tap(button: Parameters<typeof fireEvent.press>[0]) {
  await fireEvent.press(button);
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
}

async function settleDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
}

test("three quick taps send one write with the final quantity", async () => {
  const screen = await renderPanel();
  const plus = screen.getByLabelText("Increase normal quantity");

  await tap(plus);
  await tap(plus);
  await tap(plus);

  // The count moves immediately — the cache write is not debounced, only the
  // request is.
  expect(screen.getByText("3")).toBeTruthy();
  expect(save).not.toHaveBeenCalled();

  await settleDebounce();

  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith([{ cardId: "c1", quantity: 3, isFoil: false }]);
});

test("a failed write alerts instead of silently reverting", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  save.mockRejectedValue(new Error("Server said no"));

  const screen = await renderPanel();
  await tap(screen.getByLabelText("Increase normal quantity"));
  await settleDebounce();

  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith("Couldn't update quantity", "Server said no"),
  );
});

test("a settled write re-syncs the inventory family", async () => {
  const screen = await renderPanel();
  const invalidate = jest.spyOn(screen.client, "invalidateQueries");

  await tap(screen.getByLabelText("Increase normal quantity"));
  await settleDebounce();

  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({ queryKey: INVENTORY_KEY }),
  );
});
