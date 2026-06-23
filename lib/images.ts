// Scryfall serves card images at {base}/{size}/front/{imgSrc}, where imgSrc is
// the `a/b/<scryfall-id>.jpg` tail the API returns. Matches the web app's
// BASE_IMAGE_URL.
const IMAGE_BASE = "https://cards.scryfall.io";

export type CardImageSize = "small" | "normal" | "large";

export function cardImageUrl(
  imgSrc: string | null | undefined,
  size: CardImageSize = "normal",
): string | null {
  if (!imgSrc) return null;
  return `${IMAGE_BASE}/${size}/front/${imgSrc}`;
}
