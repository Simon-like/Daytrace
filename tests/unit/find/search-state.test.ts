import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSearchUrl,
  initialSearchState,
  parseSearchLocation,
  searchReducer,
} from "../../../apps/site/src/features/search/search-state";

const emptyResult = {
  items: [],
  pageInfo: { hasMore: false, nextCursor: null },
} as const;

test("search URL state is refreshable and clear removes only the query", () => {
  assert.equal(parseSearchLocation("?q=%20%E8%B1%86%E8%85%90%20"), "豆腐");
  assert.equal(createSearchUrl("/search", "?keep=yes&q=old&cursor=opaque", "registerMicroApps"), "/search?keep=yes&q=registerMicroApps");
  assert.equal(createSearchUrl("/search", "?keep=yes&q=old", ""), "/search?keep=yes");
});

test("empty, loading and service failure remain different states", () => {
  const loading = searchReducer(initialSearchState, { type: "start", query: "不存在的词" });
  assert.equal(loading.status, "loading");
  const empty = searchReducer(loading, {
    type: "success",
    attempt: loading.attempt,
    result: emptyResult,
    contentRevision: `sha256:${"b".repeat(64)}`,
  });
  assert.equal(empty.status, "empty");
  const retry = searchReducer(empty, { type: "start", query: "不存在的词" });
  const failed = searchReducer(retry, {
    type: "failure",
    attempt: retry.attempt,
    error: { code: "SEARCH_UNAVAILABLE", requestId: "find-request-001" },
  });
  assert.equal(failed.status, "error");
  assert.deepEqual(failed.error, { code: "SEARCH_UNAVAILABLE", requestId: "find-request-001" });
});

test("stale responses cannot replace a newer query", () => {
  const first = searchReducer(initialSearchState, { type: "start", query: "豆腐" });
  const second = searchReducer(first, { type: "start", query: "微前端" });
  const stale = searchReducer(second, {
    type: "success",
    attempt: first.attempt,
    result: emptyResult,
    contentRevision: `sha256:${"b".repeat(64)}`,
  });
  assert.equal(stale, second);
  assert.equal(stale.query, "微前端");
  assert.equal(stale.status, "loading");
});

test("pagination appends results, rejects stale pages and clears owner results on expiry", () => {
  const revision = `sha256:${"b".repeat(64)}`;
  const item = { record: { id: "rec_11111111-1111-4111-8111-000000000001", type: "engineering" as const, title: "记录", slug: "record", oldSlugs: [], occurredOn: null, updatedAt: "2026-11-01T00:00:00Z", revision: 1, tags: [], summary: null, status: "published" as const, visibility: "public" as const }, matches: [] };
  const start = searchReducer(initialSearchState, { type: "start", query: "记录" });
  const ready = searchReducer(start, { type: "success", attempt: start.attempt, result: { items: [item], pageInfo: { hasMore: true, nextCursor: "next" } }, contentRevision: revision });
  const loading = searchReducer(ready, { type: "more-start", attempt: ready.attempt });
  const appended = searchReducer(loading, { type: "more-success", attempt: ready.attempt, result: { items: [item], pageInfo: { hasMore: false, nextCursor: null } }, contentRevision: revision });
  assert.equal(appended.result?.items.length, 2);
  const changed = searchReducer(loading, { type: "start", query: "新查询" });
  assert.equal(searchReducer(changed, { type: "more-success", attempt: ready.attempt, result: emptyResult, contentRevision: revision }), changed);
  const expired = searchReducer(loading, { type: "more-failure", attempt: ready.attempt, error: { code: "AUTH_REQUIRED" } });
  assert.equal(expired.status, "error");
  assert.equal(expired.result, null);
  assert.equal(expired.contentRevision, null);
  const failed = searchReducer(loading, { type: "more-failure", attempt: ready.attempt, error: { code: "API_UNAVAILABLE" } });
  assert.equal(failed.moreStatus, "error");
  assert.equal(failed.result?.items.length, 1);
});
