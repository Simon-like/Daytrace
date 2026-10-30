import assert from "node:assert/strict";
import test from "node:test";
import { CONTRACT_VERSION, parsePublicArticle } from "./index";

test("shared contract accepts the current shape and rejects incompatible responses", () => {
  const article = {
    contractVersion: CONTRACT_VERSION,
    id: "id",
    slug: "slug",
    title: "title",
    date: "2026-10-30",
    summary: "summary",
    html: "<p>text</p>",
  };
  assert.deepEqual(parsePublicArticle(article), article);
  assert.throws(() => parsePublicArticle({ ...article, contractVersion: "other" }));
  assert.throws(() => parsePublicArticle({ ...article, html: null }));
});
