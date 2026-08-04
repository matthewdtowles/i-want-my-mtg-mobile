/**
 * The "Other printings" section (#108). The API returns every printing of the
 * name *including* the one on screen, so the two things worth pinning are that
 * the current printing never lists itself and that the count discounts it —
 * both of which would otherwise be off by one on every card.
 */
import { fireEvent, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { CardPrintings } from "../components/CardPrintings";
import { fetchCardPrintings } from "../lib/api/catalog";
import { renderScreen } from "./support/renderScreen";

jest.mock("expo-router", () => {
  const { View } = require("react-native");
  return { Link: ({ children }: { children: ReactNode }) => <View>{children}</View> };
});

jest.mock("../lib/api/catalog", () => ({
  ...jest.requireActual("../lib/api/catalog"),
  fetchCardPrintings: jest.fn(),
}));

const printings = fetchCardPrintings as jest.Mock;

const card = (id: string, setCode: string, setName: string) => ({
  id,
  name: "Aftershock",
  setCode,
  setName,
  number: "160",
  hasFoil: false,
  hasNonFoil: true,
  prices: { normal: 0.5 },
});

const page = (
  items: ReturnType<typeof card>[],
  meta: { page: number; total: number; totalPages: number },
) => ({ items, meta: { limit: 10, ...meta } });

beforeEach(() => printings.mockReset());

test("the printing being viewed is left out of the list and out of the count", async () => {
  printings.mockResolvedValue(
    page(
      [
        card("tmp-id", "tmp", "Tempest"),
        card("j22-id", "j22", "Jumpstart 2022"),
        card("plst-id", "plst", "The List"),
      ],
      { page: 1, total: 3, totalPages: 1 },
    ),
  );

  const screen = await renderScreen(
    <CardPrintings cardId="tmp-id" setCode="tmp" number="160" />,
  );

  await waitFor(() => expect(screen.getByText("Jumpstart 2022 #160")).toBeTruthy());
  expect(screen.getByText("The List #160")).toBeTruthy();
  // The card on screen is in the response but must not be a row linking to itself.
  expect(screen.queryByText("Tempest #160")).toBeNull();
  // Two others, not the three the API counted.
  expect(screen.getByText("2")).toBeTruthy();
});

test("a card printed only once renders no section at all", async () => {
  printings.mockResolvedValue(
    page([card("tmp-id", "tmp", "Tempest")], { page: 1, total: 1, totalPages: 1 }),
  );

  const screen = await renderScreen(
    <CardPrintings cardId="tmp-id" setCode="tmp" number="160" />,
  );

  await waitFor(() => expect(printings).toHaveBeenCalled());
  expect(screen.queryByText("Other printings")).toBeNull();
});

test("Show more appends the next page and then retires itself", async () => {
  printings.mockImplementation(async (_code: string, _num: string, page_ = 1) =>
    page_ === 1
      ? page([card("tmp-id", "tmp", "Tempest"), card("j22-id", "j22", "Jumpstart 2022")], {
          page: 1,
          total: 3,
          totalPages: 2,
        })
      : page([card("plst-id", "plst", "The List")], {
          page: 2,
          total: 3,
          totalPages: 2,
        }),
  );

  const screen = await renderScreen(
    <CardPrintings cardId="tmp-id" setCode="tmp" number="160" />,
  );

  await waitFor(() => expect(screen.getByText("Jumpstart 2022 #160")).toBeTruthy());
  expect(screen.queryByText("The List #160")).toBeNull();

  await fireEvent.press(screen.getByText("Show more"));

  await waitFor(() => expect(screen.getByText("The List #160")).toBeTruthy());
  // Page 1's rows stay put rather than being replaced by page 2's.
  expect(screen.getByText("Jumpstart 2022 #160")).toBeTruthy();
  expect(screen.queryByText("Show more")).toBeNull();
});

test("a response with no meta still lists the printings it did return", async () => {
  // `meta` is optional on the envelope. Falling back to a total of 0 would hide
  // a section whose rows are already in hand.
  printings.mockResolvedValue({
    items: [card("tmp-id", "tmp", "Tempest"), card("j22-id", "j22", "Jumpstart 2022")],
  });

  const screen = await renderScreen(
    <CardPrintings cardId="tmp-id" setCode="tmp" number="160" />,
  );

  await waitFor(() => expect(screen.getByText("Jumpstart 2022 #160")).toBeTruthy());
  expect(screen.getByText("1")).toBeTruthy();
});

test("a failed fetch offers a retry instead of silently showing nothing", async () => {
  printings.mockRejectedValue(new Error("boom"));

  const screen = await renderScreen(
    <CardPrintings cardId="tmp-id" setCode="tmp" number="160" />,
  );

  await waitFor(() =>
    expect(screen.getByText("Couldn’t load other printings.")).toBeTruthy(),
  );
});
