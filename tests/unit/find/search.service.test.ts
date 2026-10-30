import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecordSummary, RecordType } from "@daytrace/contracts";
import { SearchUnavailableError } from "../../../apps/api/src/modules/search/search.errors";
import { SearchService, type SearchIndexSnapshot } from "../../../apps/api/src/modules/search/search.service";

function record(id: string, type: RecordType, title: string, tags: readonly string[]): RecordSummary {
  return {
    id: `rec_${id}`,
    type,
    title,
    slug: id,
    oldSlugs: [],
    occurredOn: "2026-10-29",
    updatedAt: "2026-10-30T09:30:00+08:00",
    revision: 1,
    tags,
    summary: null,
    status: "published",
    visibility: "public",
  };
}

const titleHit = record("00000000-0000-4000-8000-000000000001", "engineering", "微前端路由排查", ["实践"]);
const tagHit = record("00000000-0000-4000-8000-000000000002", "engineering", "主子应用通信", ["微前端", "路由"]);
const bodyHit = record("00000000-0000-4000-8000-000000000003", "engineering", "注册应用", ["实践"]);
const tofu = record("00000000-0000-4000-8000-000000000004", "recipe", "麻婆豆腐", ["菜谱", "豆腐"]);
const revision = `sha256:${"c".repeat(64)}`;
const snapshot: SearchIndexSnapshot = {
  contentRevision: revision,
  records: [
    { record: bodyHit, bodyText: "调用 registerMicroApps 前，先确认微前端入口。" },
    { record: tagHit, bodyText: "没有命中正文。" },
    { record: titleHit, bodyText: "没有命中正文。" },
    { record: tofu, bodyText: "这次豆腐减少了放盐。" },
  ],
};

test("title, tag and body hits have stable priority and filters use AND tags", () => {
  const service = new SearchService({ read: () => snapshot });
  const result = service.searchPublic({ q: "微前端", tags: [], limit: 20 });
  assert.deepEqual(result.items.map((item) => item.record.id), [titleHit.id, tagHit.id, bodyHit.id]);
  assert.equal(result.contentRevision, revision);
  const filtered = service.searchPublic({ q: "微前端", type: "engineering", tags: ["微前端", "路由"], limit: 20 });
  assert.deepEqual(filtered.items.map((item) => item.record.id), [tagHit.id]);
});

test("body snippets use Unicode code-point ranges and English matching ignores case", () => {
  const service = new SearchService({ read: () => snapshot });
  const result = service.searchPublic({ q: "registermicroapps", tags: [], limit: 20 });
  const match = result.items[0]?.matches.find((item) => item.field === "body");
  assert.ok(match);
  const points = Array.from(match.text);
  const range = match.ranges[0];
  assert.ok(range);
  assert.equal(points.slice(range.start, range.start + range.length).join(""), "registerMicroApps");
});

test("no hit is a successful empty page; index failure stays SEARCH_UNAVAILABLE", () => {
  const service = new SearchService({ read: () => snapshot });
  const empty = service.searchPublic({ q: "完全不存在的词", tags: [], limit: 20 });
  assert.equal(empty.items.length, 0);
  assert.equal(empty.pageInfo.hasMore, false);
  const unavailable = new SearchService({ read: () => { throw new SearchUnavailableError(); } });
  assert.throws(() => unavailable.searchPublic({ q: "豆腐", tags: [], limit: 20 }), (error: unknown) =>
    error instanceof SearchUnavailableError && error.code === "SEARCH_UNAVAILABLE" && error.status === 503
  );
});

test("search cursors are signed and bound to query, filters and content revision", () => {
  const service = new SearchService({ read: () => snapshot });
  const first = service.searchPublic({ q: "微前端", tags: [], limit: 1 });
  assert.equal(first.pageInfo.hasMore, true);
  assert.ok(first.pageInfo.nextCursor);
  assert.ok(!first.pageInfo.nextCursor.includes("微前端"));
  const second = service.searchPublic({ q: "微前端", tags: [], limit: 1, cursor: first.pageInfo.nextCursor });
  assert.deepEqual(second.items.map((item) => item.record.id), [tagHit.id]);
  assert.throws(() => service.searchPublic({ q: "豆腐", tags: [], limit: 1, cursor: first.pageInfo.nextCursor! }), (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "INVALID_CURSOR"
  );
});
