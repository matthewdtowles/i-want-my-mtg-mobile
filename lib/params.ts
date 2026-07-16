/**
 * expo-router search params come through as `string | string[]` (a param can
 * repeat in the URL). Almost everywhere we want the single first value; this is
 * the one place that unwraps it so call sites stop hand-rolling the ternary.
 *
 * Always returns `string | undefined`: an empty array or a missing param has no
 * first value, and callers already guard for that.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
