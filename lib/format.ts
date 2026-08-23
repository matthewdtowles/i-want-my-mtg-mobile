export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "-";
  return `$${value.toFixed(2)}`;
}

/**
 * The single price to show for a card in a list, and whether it came from the
 * foil printing.
 *
 * Plenty of cards are only ever printed in foil, and some that should have a
 * normal printing have no normal price tracked. Reading `prices.normal` alone
 * showed those as "-" even though the card has a perfectly good price. The
 * server already resolves it this way when sorting - the `prices.normal` sort
 * is `COALESCE(normal, foil, 0)` - which is why a list of dashes still sorted
 * by price correctly. This makes what is displayed agree with what it is
 * sorted by.
 */
export function listPrice(
  prices: { normal?: number | null; foil?: number | null } | null | undefined
): { value: number | null; isFoil: boolean } {
  if (prices?.normal != null) return { value: prices.normal, isFoil: false };
  if (prices?.foil != null) return { value: prices.foil, isFoil: true };
  return { value: null, isFoil: false };
}

/** Capitalize a deck format for display, or "No format" when unset. */
export function formatDeckFormat(format: string | null | undefined): string {
  if (!format) return "No format";
  return format[0].toUpperCase() + format.slice(1);
}
