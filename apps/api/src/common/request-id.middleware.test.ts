import assert from "node:assert/strict";
import test from "node:test";
import { REQUEST_ID_PATTERN } from "./request-id.middleware";

test("request IDs accept bounded correlation values only", () => {
  assert.ok(REQUEST_ID_PATTERN.test("request-1234"));
  assert.ok(REQUEST_ID_PATTERN.test("4f2b2f4d-e27c-4f08-9f38-e0f4d3cf0c4a"));
  assert.ok(!REQUEST_ID_PATTERN.test("short"));
  assert.ok(!REQUEST_ID_PATTERN.test("bad request\nX-Leak: true"));
  assert.ok(!REQUEST_ID_PATTERN.test("x".repeat(129)));
});
