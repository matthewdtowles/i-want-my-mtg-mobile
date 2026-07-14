import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatPrice } from "./format";

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
