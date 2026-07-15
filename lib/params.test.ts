import assert from "node:assert/strict";
import { test } from "node:test";
import { firstParam } from "./params";

test("firstParam returns a plain string unchanged", () => {
  assert.equal(firstParam("abc"), "abc");
});

test("firstParam returns the first element of an array", () => {
  assert.equal(firstParam(["first", "second"]), "first");
});

test("firstParam passes undefined through", () => {
  assert.equal(firstParam(undefined), undefined);
});

test("firstParam returns undefined for an empty array", () => {
  assert.equal(firstParam([]), undefined);
});
