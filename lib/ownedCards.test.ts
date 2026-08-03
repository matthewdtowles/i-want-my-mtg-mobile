import assert from "node:assert/strict";
import { test } from "node:test";

import { ownedSnapshot } from "./ownedCards";
import type { ApiInventoryQuantity } from "./api/types";

function row(cardId: string, normal: number, foil: number): ApiInventoryQuantity {
  return { cardId, normalQuantity: normal, foilQuantity: foil };
}

test("keeps only cards with a copy in some finish", () => {
  const snap = ownedSnapshot(
    ["a", "b", "c", "d"],
    [row("a", 2, 0), row("b", 0, 1), row("c", 0, 0)],
  );
  assert.deepEqual([...snap.owned.keys()].sort(), ["a", "b"]);
  assert.deepEqual(snap.owned.get("a"), { normal: 2, foil: 0 });
  assert.deepEqual(snap.owned.get("b"), { normal: 0, foil: 1 });
});

test("records every requested id, owned or not", () => {
  const snap = ownedSnapshot(["a", "b"], [row("a", 1, 0)]);
  assert.equal(snap.requested.has("b"), true);
  assert.equal(snap.owned.has("b"), false);
});

test("a card outside the request is unanswered, not unowned", () => {
  const snap = ownedSnapshot(["a"], [row("a", 1, 0)]);
  assert.equal(snap.requested.has("z"), false);
  assert.equal(snap.owned.has("z"), false);
});
