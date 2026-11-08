import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPublicRecords, RecordsRequestError } from "@daytrace/content/records";

const filters = { type: "engineering" as const, tags: ["后端", "记录"] };

test("archive page requests retain filters, limit and opaque cursor", async () => {
  const original = globalThis.fetch;
  let requested = "";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requested = String(input);
    return Response.json({ schemaVersion: "1.0", data: { items: [], pageInfo: { hasMore: false, nextCursor: null } }, meta: { requestId: "test", contentRevision: `sha256:${"a".repeat(64)}` } });
  }) as typeof fetch;
  try {
    await fetchPublicRecords(filters, undefined, "opaque+cursor");
    const query = new URL(requested, "http://localhost").searchParams;
    assert.equal(query.get("limit"), "50");
    assert.equal(query.get("cursor"), "opaque+cursor");
    assert.equal(query.get("type"), "engineering");
    assert.deepEqual(query.getAll("tag"), filters.tags);
  } finally { globalThis.fetch = original; }
});

test("archive page errors do not become empty results", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("unavailable", { status: 503 })) as typeof fetch;
  try {
    await assert.rejects(fetchPublicRecords(filters), RecordsRequestError);
  } finally { globalThis.fetch = original; }
});
