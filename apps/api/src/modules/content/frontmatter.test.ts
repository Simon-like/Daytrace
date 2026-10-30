import assert from "node:assert/strict";
import test from "node:test";
import { parseFrontmatter } from "./frontmatter";

const valid = `---
schemaVersion: 1
id: rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111
type: engineering
title: 合成标题
slug: synthetic-title
occurredOn: 2026-10-30
updatedAt: "2026-10-30T08:00:00+08:00"
revision: 1
status: published
visibility: public
---
正文`;

test("frontmatter applies portable defaults and normalizes YAML dates", () => {
  const result = parseFrontmatter(valid, "public/sample/index.md");
  assert.deepEqual(result.issues, []);
  assert.equal(result.metadata?.occurredOn, "2026-10-30");
  assert.deepEqual(result.metadata?.oldSlugs, []);
  assert.deepEqual(result.metadata?.attachments, []);
});

test("missing visibility fails closed instead of becoming a valid private record", () => {
  const result = parseFrontmatter(valid.replace("visibility: public\n", ""), "public/missing/index.md");
  assert.equal(result.metadata, null);
  assert.ok(result.issues.some((item) => item.code === "CONTENT_VISIBILITY_MISSING" && item.field === "visibility"));
});

test("unknown fields and invalid calendar dates have exact locations", () => {
  const result = parseFrontmatter(
    valid.replace("occurredOn: 2026-10-30", "occurredOn: 2026-02-30\nvisiblity: public"),
    "public/bad/index.md",
  );
  assert.ok(result.issues.some((item) => item.code === "CONTENT_FIELD_INVALID" && item.field === "occurredOn"));
  assert.ok(result.issues.some((item) => item.code === "CONTENT_FIELD_INVALID" && item.field === "visiblity"));
});
