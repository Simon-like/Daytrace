import assert from "node:assert/strict";
import test from "node:test";
import { parseApiRuntimeConfig, parseSiteRuntimeConfig } from "./index";

test("API config applies local defaults and rejects invalid ports", () => {
  assert.deepEqual(parseApiRuntimeConfig({}, "/synthetic/content"), {
    host: "127.0.0.1",
    port: 3001,
    contentRoot: "/synthetic/content",
  });
  assert.throws(() => parseApiRuntimeConfig({ API_PORT: "0" }, "/synthetic/content"));
  assert.throws(() => parseApiRuntimeConfig({ API_PORT: "3001x" }, "/synthetic/content"));
});

test("site config only accepts a fixed credential-free HTTP origin", () => {
  assert.deepEqual(parseSiteRuntimeConfig({ API_INTERNAL_ORIGIN: "http://127.0.0.1:3001/" }), {
    apiInternalOrigin: "http://127.0.0.1:3001",
  });
  for (const value of [
    undefined,
    "file:///tmp/api",
    "http://user:secret@localhost:3001",
    "http://localhost:3001/base",
    "http://localhost:3001/?target=other",
  ]) {
    assert.throws(() => parseSiteRuntimeConfig({ API_INTERNAL_ORIGIN: value }));
  }
});
