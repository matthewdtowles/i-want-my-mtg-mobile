export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "-";
  return `$${value.toFixed(2)}`;
}
