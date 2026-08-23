/**
 * A foil-sourced price must say so.
 *
 * Foil-only cards used to render as "-" in every list, because the lists read
 * `prices.normal` on its own. Fixing the value alone is only half of it: a foil
 * price is not the price of the normal printing, so showing it bare reads as
 * the normal price. The label is the other half, and it is easy for a new
 * surface to take the fallback and forget it - the number looks right either
 * way. `CardPrice` binds the two together so it cannot.
 *
 * Revert check: drop the `isFoil` branch in `components/CardPrice.tsx` and
 * "labels a foil-sourced price" fails.
 */
import { screen } from "@testing-library/react-native";

import { CardPrice } from "../components/CardPrice";
import { renderScreen } from "./support/renderScreen";

describe("CardPrice", () => {
  it("shows the normal price unlabelled when there is one", async () => {
    await renderScreen(<CardPrice prices={{ normal: 3.5, foil: 12 }} />);

    expect(screen.getByText(/\$3\.50/)).toBeTruthy();
    expect(screen.queryByText(/foil/)).toBeNull();
  });

  it("labels a foil-sourced price", async () => {
    await renderScreen(<CardPrice prices={{ normal: null, foil: 12 }} />);

    expect(screen.getByText(/\$12\.00/)).toBeTruthy();
    expect(screen.getByText(/foil/)).toBeTruthy();
  });

  it("still shows a dash when neither finish has a price", async () => {
    await renderScreen(<CardPrice prices={{ normal: null, foil: null }} />);

    expect(screen.getByText(/-/)).toBeTruthy();
    expect(screen.queryByText(/foil/)).toBeNull();
  });
});
