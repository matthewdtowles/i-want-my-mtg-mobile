import type { ApiSet } from "./api/types";

/**
 * The value to show for a set, with the weekly move for the same half of it.
 * Bonus sets — Commander decks, Secret Lair, promo sets — have no base half
 * (`baseSize` 0), so the backend reports `basePrice` and its weekly change as
 * 0 and only the `total*` figures cover their cards. Same split
 * `effectiveSetSize` applies to the card count.
 */
export function effectiveSetValue(
  set: Partial<Pick<ApiSet, "baseSize" | "prices">>,
): { price: number | null; change: number | null } {
  const prices = set.prices;
  if (!prices) return { price: null, change: null };
  return set.baseSize
    ? {
        price: prices.basePrice ?? null,
        change: prices.basePriceChangeWeekly ?? null,
      }
    : {
        price: prices.totalPrice ?? null,
        change: prices.totalPriceChangeWeekly ?? null,
      };
}
