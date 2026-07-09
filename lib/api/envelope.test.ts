import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { errMessage } from "./envelope";

// The IWMM web API's error responses (post W1 overhaul) are a uniform
// { success: false, error: "<message>" } envelope. errMessage must surface that
// `error` field, and fall back to the provided default when it's missing.
describe("errMessage", () => {
  it("returns the error field from the IWMM { success, error } envelope", () => {
    const body = { success: false, error: "Deck not found." };
    assert.equal(errMessage(body, "Failed to load deck."), "Deck not found.");
  });

  it("falls back when the body has no error field", () => {
    assert.equal(errMessage({ success: false }, "fallback"), "fallback");
  });

  it("falls back when error is not a string", () => {
    assert.equal(errMessage({ error: { nested: true } }, "fallback"), "fallback");
  });

  it("falls back for null / undefined / non-object bodies", () => {
    assert.equal(errMessage(null, "fallback"), "fallback");
    assert.equal(errMessage(undefined, "fallback"), "fallback");
    assert.equal(errMessage("plain string", "fallback"), "fallback");
  });
});
