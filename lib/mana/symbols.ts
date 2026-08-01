import { MANA_SYMBOL_SVGS } from "./symbols.generated";

// The API returns mana-font style codes with the slash dropped - "{ub}",
// "{2w}", "{rp}" - while Scryfall keys its artwork "U/B", "2/W", "R/P". Index
// every hybrid under the slashless spelling too, plus a character-sorted alias
// so a cost that lists the halves the other way round ("{bu}") still resolves.
const ALIASES: Record<string, string> = {};
for (const key of Object.keys(MANA_SYMBOL_SVGS)) {
  if (!key.includes("/")) continue;
  const flat = key.split("/").join("");
  ALIASES[flat] ??= key;
  ALIASES[sortChars(flat)] ??= key;
}

function sortChars(code: string): string {
  return code.split("").sort().join("");
}

/**
 * Resolve an uppercased mana code from a cost string ("R", "UB", "2W") to the
 * key its artwork lives under in MANA_SYMBOL_SVGS, or null if we have none.
 * Exact keys always win, so an alias can never shadow a real symbol.
 */
export function manaSymbolKey(code: string): string | null {
  if (code in MANA_SYMBOL_SVGS) return code;
  return ALIASES[code] ?? ALIASES[sortChars(code)] ?? null;
}

export { MANA_SYMBOL_SVGS };
