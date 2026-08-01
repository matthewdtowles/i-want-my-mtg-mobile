// Split a string containing mana symbols - a cost ("{2}{G/W}{R}") or a line of
// oracle text ("{T}: Add {R}.") - into the pieces <ManaCost> and <ManaText>
// render. Mirrors the web app's parseManaTokens
// (src/http/hbs/deck/deck-mana.ts), but keeps the Scryfall symbol code intact
// so it can index the bundled artwork.
import { manaSymbolKey } from "./symbols";

export type ManaToken =
  /** A symbol we have artwork for; `code` indexes MANA_SYMBOL_SVGS. */
  | { kind: "symbol"; code: string }
  /** Everything in between, verbatim - prose, separators, unknown symbols. */
  | { kind: "text"; text: string };

/**
 * Text runs are returned verbatim, whitespace included, so prose survives the
 * round trip; callers rendering a bare cost drop the whitespace-only runs.
 */
export function parseManaSymbols(
  source: string | null | undefined,
): ManaToken[] {
  if (!source) return [];
  const tokens: ManaToken[] = [];
  let cursor = 0;
  for (const match of source.matchAll(/\{([^}]*)\}/g)) {
    const between = source.slice(cursor, match.index);
    if (between) tokens.push({ kind: "text", text: between });
    cursor = match.index + match[0].length;

    const key = manaSymbolKey(match[1].toUpperCase());
    tokens.push(
      key ? { kind: "symbol", code: key } : { kind: "text", text: match[0] },
    );
  }
  const trailing = source.slice(cursor);
  if (trailing) tokens.push({ kind: "text", text: trailing });
  return tokens;
}
