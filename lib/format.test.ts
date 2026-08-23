import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDeckFormat, formatPrice, listPrice } from "./format";

describe("formatPrice", () => {
  it("renders a dash for null/undefined", () => {
    assert.equal(formatPrice(null), "-");
    assert.equal(formatPrice(undefined), "-");
  });

  it("renders two decimal places with a dollar sign", () => {
    assert.equal(formatPrice(0), "$0.00");
    assert.equal(formatPrice(3.5), "$3.50");
    assert.equal(formatPrice(12.349), "$12.35");
  });
});

describe("formatDeckFormat", () => {
  it("returns 'No format' for null/undefined/empty", () => {
    assert.equal(formatDeckFormat(null), "No format");
    assert.equal(formatDeckFormat(undefined), "No format");
    assert.equal(formatDeckFormat(""), "No format");
  });

  it("title-cases the format name", () => {
    assert.equal(formatDeckFormat("commander"), "Commander");
    assert.equal(formatDeckFormat("modern"), "Modern");
  });
});

describe("listPrice", () => {
  it("uses the normal price when there is one", () => {
    assert.deepEqual(listPrice({ normal: 3.5, foil: 12 }), { value: 3.5, isFoil: false });
  });

  it("falls back to foil for a card with no normal price", () => {
    assert.deepEqual(listPrice({ normal: null, foil: 12 }), { value: 12, isFoil: true });
  });

  it("treats a zero normal price as a real price, not a missing one", () => {
    assert.deepEqual(listPrice({ normal: 0, foil: 12 }), { value: 0, isFoil: false });
  });

  it("reports no price when neither finish has one", () => {
    assert.deepEqual(listPrice({ normal: null, foil: null }), { value: null, isFoil: false });
    assert.deepEqual(listPrice(null), { value: null, isFoil: false });
    assert.deepEqual(listPrice(undefined), { value: null, isFoil: false });
  });
});
