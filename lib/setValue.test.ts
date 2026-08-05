import assert from "node:assert/strict";
import { test } from "node:test";

import { effectiveSetValue } from "./setValue";

const prices = {
  basePrice: 680.28,
  totalPrice: 4983.5,
  basePriceChangeWeekly: 3.99,
  totalPriceChangeWeekly: 3.28,
};

test("a main set values its base cards, not the extras", () => {
  assert.deepEqual(effectiveSetValue({ baseSize: 303, prices }), {
    price: 680.28,
    change: 3.99,
  });
});

test("a bonus set with no base half falls back to its total value", () => {
  // m3c: baseSize 0 makes basePrice 0, so the base figures are meaningless.
  assert.deepEqual(
    effectiveSetValue({
      baseSize: 0,
      prices: {
        basePrice: 0,
        totalPrice: 744.045,
        basePriceChangeWeekly: 0,
        totalPriceChangeWeekly: 8.28,
      },
    }),
    { price: 744.045, change: 8.28 },
  );
});

test("no prices at all read as unknown, not as zero", () => {
  assert.deepEqual(effectiveSetValue({ baseSize: 303 }), {
    price: null,
    change: null,
  });
  assert.deepEqual(effectiveSetValue({ baseSize: 0, prices: {} }), {
    price: null,
    change: null,
  });
});
