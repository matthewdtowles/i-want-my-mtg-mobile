import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cardImageUrl, setSymbolUrl } from "./images";

describe("cardImageUrl", () => {
  it("returns null for a missing source", () => {
    assert.equal(cardImageUrl(null), null);
    assert.equal(cardImageUrl(undefined), null);
    assert.equal(cardImageUrl(""), null);
  });

  it("builds the Scryfall URL from the a/b/<id>.jpg tail at the requested size", () => {
    assert.equal(
      cardImageUrl("a/b/abc123.jpg"),
      "https://cards.scryfall.io/normal/front/a/b/abc123.jpg",
    );
    assert.equal(
      cardImageUrl("a/b/abc123.jpg", "large"),
      "https://cards.scryfall.io/large/front/a/b/abc123.jpg",
    );
  });

  it("re-normalizes a full URL that already has a size baked in", () => {
    const full = "https://cards.scryfall.io/small/front/a/b/abc123.jpg";
    assert.equal(
      cardImageUrl(full, "large"),
      "https://cards.scryfall.io/large/front/a/b/abc123.jpg",
    );
  });
});

describe("setSymbolUrl", () => {
  it("returns null for a missing code", () => {
    assert.equal(setSymbolUrl(null), null);
    assert.equal(setSymbolUrl(undefined), null);
    assert.equal(setSymbolUrl(""), null);
  });

  it("builds the lowercased Scryfall SVG URL", () => {
    assert.equal(setSymbolUrl("MH3"), "https://svgs.scryfall.io/sets/mh3.svg");
    assert.equal(setSymbolUrl("neo"), "https://svgs.scryfall.io/sets/neo.svg");
  });
});
