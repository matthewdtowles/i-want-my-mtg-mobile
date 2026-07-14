import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTokenExpiryMs, isExpiringSoon } from "./jwt";

/** Build a JWT whose payload carries `{ exp }` (seconds), like the real token. */
function tokenWithExp(expSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
  return `header.${payload}.signature`;
}

describe("getTokenExpiryMs", () => {
  it("reads exp (seconds) and returns epoch ms", () => {
    assert.equal(getTokenExpiryMs(tokenWithExp(1_700_000_000)), 1_700_000_000_000);
  });

  it("survives a payload with multi-byte UTF-8 fields alongside exp", () => {
    const payload = Buffer.from(
      JSON.stringify({ name: "Ævar Ω 名前", exp: 1_700_000_000 }),
    ).toString("base64url");
    assert.equal(getTokenExpiryMs(`h.${payload}.s`), 1_700_000_000_000);
  });

  it("returns null when there is no payload segment", () => {
    assert.equal(getTokenExpiryMs("not-a-jwt"), null);
  });

  it("returns null when the payload has no exp claim", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "1" })).toString("base64url");
    assert.equal(getTokenExpiryMs(`h.${payload}.s`), null);
  });
});

describe("isExpiringSoon", () => {
  it("is true for an already-expired token", () => {
    assert.equal(isExpiringSoon(tokenWithExp(Math.floor(Date.now() / 1000) - 60)), true);
  });

  it("is true within the skew window", () => {
    const exp = Math.floor(Date.now() / 1000) + 10; // 10s out, default skew 30s
    assert.equal(isExpiringSoon(tokenWithExp(exp)), true);
  });

  it("is false for a token well in the future", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    assert.equal(isExpiringSoon(tokenWithExp(exp)), false);
  });

  it("is false when the expiry can't be read (let the 401 backstop handle it)", () => {
    assert.equal(isExpiringSoon("garbage"), false);
  });
});
