import type { ApiSet } from "./api/types";

/**
 * The card count to show for a set. Bonus sets — Mystery Booster, promo and
 * Secret Lair sets — have no base half, so their `baseSize` is 0 and only
 * `totalSize` is meaningful. Same rule the web app applies in its set DTO.
 * Returns null when the set carries neither, so callers can omit the count
 * instead of printing "0 cards".
 */
export function effectiveSetSize(
  set: Partial<Pick<ApiSet, "baseSize" | "totalSize">>,
): number | null {
  return set.baseSize || set.totalSize || null;
}
