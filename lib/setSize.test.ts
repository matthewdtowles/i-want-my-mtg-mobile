import assert from "node:assert/strict";
import { test } from "node:test";

import { effectiveSetSize } from "./setSize";

test("a main set counts its base cards, not the extras", () => {
  assert.equal(effectiveSetSize({ baseSize: 261, totalSize: 411 }), 261);
});

test("a bonus set with no base half falls back to its total", () => {
  assert.equal(effectiveSetSize({ baseSize: 0, totalSize: 411 }), 411);
});

test("no size at all reads as unknown, not as zero", () => {
  assert.equal(effectiveSetSize({}), null);
  assert.equal(effectiveSetSize({ baseSize: 0 }), null);
});
