// Scryfall serves card images at {base}/{size}/front/{imgSrc}, where imgSrc is
// the `a/b/<scryfall-id>.jpg` tail the API returns. Matches the web app's
// BASE_IMAGE_URL.
const IMAGE_BASE = "https://cards.scryfall.io";

// Scryfall rejects requests that use a default HTTP-library User-Agent. Android's
// RN image loader (OkHttp) sends `okhttp/x.y.z`, which returns HTTP 400 with
// subcode `generic_user_agent`, so card art silently fails on Android while iOS
// (NSURLSession) is unaffected. Send a custom UA identifying the app so the
// request succeeds on Android; it's harmless on iOS.
export const SCRYFALL_USER_AGENT = "IWantMyMTG/1.0 (i-want-my-mtg-mobile)";

export type CardImageSize = "small" | "normal" | "large" | "art_crop";

export function cardImageUrl(
  imgSrc: string | null | undefined,
  size: CardImageSize = "normal",
): string | null {
  if (!imgSrc) return null;
  // Most endpoints return just the `a/b/<id>.jpg` tail, but some (inventory)
  // return a full Scryfall URL with the size baked in. Normalize to the tail so
  // we always control the requested size.
  const tail = imgSrc.includes("/front/")
    ? imgSrc.slice(imgSrc.indexOf("/front/") + "/front/".length)
    : imgSrc;
  return `${IMAGE_BASE}/${size}/front/${tail}`;
}

// Scryfall's per-set symbol SVGs (the same glyphs as the Keyrune font).
const SET_SVG_BASE = "https://svgs.scryfall.io/sets";

export function setSymbolUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  return `${SET_SVG_BASE}/${code.toLowerCase()}.svg`;
}
