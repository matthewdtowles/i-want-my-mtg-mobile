import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSetEntries } from "./setBlocks";
import type { ApiSet } from "./api/types";

function set(partial: Partial<ApiSet> & { code: string }): ApiSet {
  return {
    name: partial.code,
    type: "expansion",
    releaseDate: "2024-01-01",
    baseSize: 100,
    totalSize: 100,
    keyruneCode: partial.code,
    isMain: true,
    tags: [],
    ...partial,
  } as ApiSet;
}

test("a lone set gets no block header", () => {
  const entries = buildSetEntries([set({ code: "DSK" })]);
  assert.deepEqual(
    entries.map((e) => e.kind),
    ["set"],
  );
});

test("sets sharing a parent get one header, main set first", () => {
  const entries = buildSetEntries([
    set({ code: "PBLB", parentCode: "BLB", isMain: false, releaseDate: "2024-08-02" }),
    set({ code: "BLB", block: "Bloomburrow", releaseDate: "2024-08-02" }),
  ]);
  assert.deepEqual(
    entries.map((e) => e.key),
    ["block-BLB", "BLB", "PBLB"],
  );
  assert.equal(entries[0].kind === "header" && entries[0].blockName, "Bloomburrow");
});

test("a block the server flags as multi-set is headed even with one set on the page", () => {
  const entries = buildSetEntries([set({ code: "BLB", block: "Bloomburrow" })], ["BLB"]);
  assert.deepEqual(
    entries.map((e) => e.kind),
    ["header", "set"],
  );
});

test("only a headed block's sets are marked for indenting", () => {
  const entries = buildSetEntries(
    [
      set({ code: "BLB", block: "Bloomburrow", releaseDate: "2024-08-02" }),
      set({ code: "PBLB", parentCode: "BLB", isMain: false, releaseDate: "2024-08-02" }),
      set({ code: "PF24", isMain: false, releaseDate: "2024-08-01" }),
    ],
    [],
  );
  assert.deepEqual(
    entries.map((e) => (e.kind === "set" ? [e.key, e.inBlock] : e.key)),
    ["block-BLB", ["BLB", true], ["PBLB", true], ["PF24", false]],
  );
});

test("blocks are ordered newest first", () => {
  const entries = buildSetEntries([
    set({ code: "OTJ", releaseDate: "2024-04-19" }),
    set({ code: "DSK", releaseDate: "2024-09-27" }),
    set({ code: "BLB", releaseDate: "2024-08-02" }),
  ]);
  assert.deepEqual(
    entries.map((e) => e.key),
    ["DSK", "BLB", "OTJ"],
  );
});

test("a block with no name of its own falls back to its main set's name", () => {
  const entries = buildSetEntries(
    [
      set({ code: "FDN", name: "Foundations" }),
      set({ code: "PFDN", parentCode: "FDN", isMain: false }),
    ],
    [],
  );
  assert.equal(entries[0].kind === "header" && entries[0].blockName, "Foundations");
});
