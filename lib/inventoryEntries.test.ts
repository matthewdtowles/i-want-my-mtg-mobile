import assert from "node:assert/strict";
import { test } from "node:test";

import { buildEntries, entryKey, type GroupableItem } from "./inventoryEntries";

function item(cardId: string, setCode?: string, isFoil = false): GroupableItem {
  return { cardId, isFoil, setCode, keyruneCode: setCode };
}

test("packs items into rows of `columns` when not grouping", () => {
  const entries = buildEntries(
    [item("a"), item("b"), item("c"), item("d")],
    false,
    3,
  );
  assert.deepEqual(
    entries.map((e) => e.kind),
    ["row", "row"],
  );
  assert.equal(entries[0].kind === "row" && entries[0].items.length, 3);
  assert.equal(entries[1].kind === "row" && entries[1].items.length, 1);
});

test("emits one header per set and never straddles a set boundary", () => {
  const entries = buildEntries(
    [item("a", "dmu"), item("b", "dmu"), item("c", "bro"), item("d", "bro")],
    true,
    3,
  );
  assert.deepEqual(
    entries.map((e) => e.kind),
    ["header", "row", "header", "row"],
  );
  // The partial dmu row is flushed rather than filled with the first bro card.
  assert.equal(entries[1].kind === "row" && entries[1].items.length, 2);
  assert.equal(entries[2].kind === "header" && entries[2].setCode, "BRO".toLowerCase());
});

test("header counts cover every loaded card in that set", () => {
  const entries = buildEntries(
    [item("a", "dmu"), item("b", "dmu"), item("c", "dmu"), item("d", "dmu")],
    true,
    3,
  );
  assert.equal(entries[0].kind === "header" && entries[0].count, 4);
  // Four cards over three columns is two rows under the one header.
  assert.deepEqual(
    entries.map((e) => e.kind),
    ["header", "row", "row"],
  );
});

test("groups a run of items missing a set code under one header", () => {
  const entries = buildEntries([item("a"), item("b")], true, 3);
  assert.deepEqual(
    entries.map((e) => e.kind),
    ["header", "row"],
  );
  assert.equal(entries[0].kind === "header" && entries[0].setCode, "");
});

test("returns nothing for an empty inventory", () => {
  assert.deepEqual(buildEntries([], true, 3), []);
});

test("entryKey separates the foil and normal holdings of one card", () => {
  assert.notEqual(entryKey(item("a", "dmu", true)), entryKey(item("a", "dmu", false)));
});
