/**
 * expo-router search params come through as `string | string[]` (a param can
 * repeat in the URL). Almost everywhere we want the single first value; this is
 * the one place that unwraps it so call sites stop hand-rolling the ternary.
 *
 * Overloaded so it preserves the caller's type: a non-optional param stays
 * `string`, an optional one stays `string | undefined`.
 */
export function firstParam(value: string | string[]): string;
export function firstParam(value: string | string[] | undefined): string | undefined;
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
