import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPublicSearch, fetchSearch, SearchRequestError } from "../../../packages/content/src/search-api";

const emptyResponse = {
  schemaVersion: "1.0",
  data: { items: [], pageInfo: { hasMore: false, nextCursor: null } },
  meta: { requestId: "synthetic-search", contentRevision: `sha256:${"a".repeat(64)}` },
};

test("owner search sends explicit scope while the public wrapper remains unchanged", async (context) => {
  const urls: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    urls.push(String(input));
    return Response.json(emptyResponse);
  });
  await fetchPublicSearch("公开");
  await fetchSearch("私密", "owner");
  assert.equal(new URL(urls[0]!, "http://local").searchParams.get("scope"), null);
  assert.equal(new URL(urls[1]!, "http://local").searchParams.get("scope"), "owner");
  assert.equal(new URL(urls[1]!, "http://local").searchParams.get("q"), "私密");
});

test("owner response accepts private drafts without weakening the public parser", async (context) => {
  const record = {
    id: "rec_00000000-0000-4000-8000-000000000501",
    type: "reflection",
    title: "私密草稿",
    slug: "private-draft",
    oldSlugs: [],
    occurredOn: null,
    updatedAt: "2026-11-03T09:30:00+08:00",
    revision: 1,
    tags: ["主人"],
    summary: null,
    status: "draft",
    visibility: "private",
  };
  const payload = {
    ...emptyResponse,
    data: { items: [{ record, matches: [] }], pageInfo: { hasMore: false, nextCursor: null } },
  };
  context.mock.method(globalThis, "fetch", async () => Response.json(payload));
  const owner = await fetchSearch("私密", "owner");
  assert.equal(owner.data.items[0]?.record.visibility, "private");
  await assert.rejects(fetchPublicSearch("私密"), /CONTRACT_INVALID/);
});

test("owner session expiry is a distinct AUTH_REQUIRED failure", async (context) => {
  context.mock.method(globalThis, "fetch", async () => Response.json({
    schemaVersion: "1.0",
    error: { code: "AUTH_REQUIRED", message: "主人访问需要有效会话", requestId: "expired", details: [] },
  }, { status: 401 }));
  await assert.rejects(fetchSearch("私密", "owner"), (error: unknown) => {
    assert.ok(error instanceof SearchRequestError);
    assert.equal(error.failure.code, "AUTH_REQUIRED");
    assert.equal(error.failure.requestId, "expired");
    return true;
  });
});

test("search pagination preserves scope, query and cursor", async (context) => {
  let url = "";
  context.mock.method(globalThis, "fetch", async (input: string | URL | Request) => { url = String(input); return Response.json(emptyResponse); });
  await fetchSearch("  记录  ", "owner", undefined, "signed+cursor");
  const params = new URL(url, "http://local").searchParams;
  assert.equal(params.get("q"), "记录");
  assert.equal(params.get("scope"), "owner");
  assert.equal(params.get("limit"), "20");
  assert.equal(params.get("cursor"), "signed+cursor");
});
