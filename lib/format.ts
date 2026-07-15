export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "-";
  return `$${value.toFixed(2)}`;
}

/** Title-case a deck format for display, or "No format" when unset. */
export function formatDeckFormat(format: string | null | undefined): string {
  if (!format) return "No format";
  return format[0].toUpperCase() + format.slice(1);
}
