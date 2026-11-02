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
