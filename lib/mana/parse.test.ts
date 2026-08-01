import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseManaSymbols } from "./parse";

describe("parseManaSymbols", () => {
  it("returns nothing for a missing or empty source", () => {
    assert.deepEqual(parseManaSymbols(null), []);
    assert.deepEqual(parseManaSymbols(undefined), []);
    assert.deepEqual(parseManaSymbols(""), []);
  });

  it("splits a plain cost into symbols", () => {
    assert.deepEqual(parseManaSymbols("{2}{R}{R}"), [
      { kind: "symbol", code: "2" },
      { kind: "symbol", code: "R" },
      { kind: "symbol", code: "R" },
    ]);
  });

  it("keeps hybrid, phyrexian and half symbols as single tokens", () => {
    assert.deepEqual(parseManaSymbols("{G/W}{2/U}{B/P}{HR}"), [
      { kind: "symbol", code: "G/W" },
      { kind: "symbol", code: "2/U" },
      { kind: "symbol", code: "B/P" },
      { kind: "symbol", code: "HR" },
    ]);
  });

  it("uppercases lowercase symbol codes", () => {
    assert.deepEqual(parseManaSymbols("{r}{g/w}"), [
      { kind: "symbol", code: "R" },
      { kind: "symbol", code: "G/W" },
    ]);
  });

  // The API spells hybrids without the slash, mana-font style.
  it("resolves the slashless codes the API returns", () => {
    assert.deepEqual(parseManaSymbols("{2}{rw}{rw}"), [
      { kind: "symbol", code: "2" },
      { kind: "symbol", code: "R/W" },
      { kind: "symbol", code: "R/W" },
    ]);
    assert.deepEqual(parseManaSymbols("{1}{bp}{ub}{2w}"), [
      { kind: "symbol", code: "1" },
      { kind: "symbol", code: "B/P" },
      { kind: "symbol", code: "U/B" },
      { kind: "symbol", code: "2/W" },
    ]);
  });

  it("resolves a hybrid whose halves are in the other order", () => {
    assert.deepEqual(parseManaSymbols("{bu}{pr}"), [
      { kind: "symbol", code: "U/B" },
      { kind: "symbol", code: "R/P" },
    ]);
  });

  it("keeps the separator between split-card faces", () => {
    assert.deepEqual(parseManaSymbols("{W}{U} // {B}"), [
      { kind: "symbol", code: "W" },
      { kind: "symbol", code: "U" },
      { kind: "text", text: " // " },
      { kind: "symbol", code: "B" },
    ]);
  });

  // Oracle text is prose, so the runs between symbols come back verbatim -
  // trimming them would glue words together and drop line breaks.
  it("preserves the whitespace around symbols in oracle text", () => {
    assert.deepEqual(parseManaSymbols("{T}: Add {R}.\nDraw a card."), [
      { kind: "symbol", code: "T" },
      { kind: "text", text: ": Add " },
      { kind: "symbol", code: "R" },
      { kind: "text", text: ".\nDraw a card." },
    ]);
  });

  it("falls back to the raw braces for a symbol we have no artwork for", () => {
    assert.deepEqual(parseManaSymbols("{R}{NOPE}"), [
      { kind: "symbol", code: "R" },
      { kind: "text", text: "{NOPE}" },
    ]);
  });

  it("keeps text that is not wrapped in braces", () => {
    assert.deepEqual(parseManaSymbols("no symbols here"), [
      { kind: "text", text: "no symbols here" },
    ]);
  });
});
