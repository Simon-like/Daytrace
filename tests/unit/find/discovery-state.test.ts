import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecordListData, RecordSummary } from "@daytrace/contracts";
import {
  createDiscoveryEntry,
  createDiscoveryUrl,
  mergeDiscoveryHistoryState,
  parseDiscoveryFilters,
  readDiscoveryEntry,
} from "../../../apps/site/src/features/records/discovery-state";

const record: RecordSummary = {
  id: "rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111",
  type: "engineering",
  title: "微前端排查",
  slug: "microfrontend",
  oldSlugs: [],
  occurredOn: "2026-10-29",
  updatedAt: "2026-10-30T09:30:00+08:00",
  revision: 1,
  tags: ["微前端", "路由"],
  summary: null,
  status: "published",
  visibility: "public",
};

const records: RecordListData = {
  items: [record],
  pageInfo: { hasMore: false, nextCursor: null },
};

test("discovery filters round-trip through shareable URLs with AND tags", () => {
  const filters = parseDiscoveryFilters("?type=engineering&tag=%E8%B7%AF%E7%94%B1&tag=%E5%BE%AE%E5%89%8D%E7%AB%AF&tag=%E8%B7%AF%E7%94%B1");
  assert.deepEqual(filters, { type: "engineering", tags: ["微前端", "路由"] });
  const url = createDiscoveryUrl("/", "?keep=yes&type=recipe&cursor=opaque", filters);
  assert.equal(url, "/?keep=yes&type=engineering&tag=%E5%BE%AE%E5%89%8D%E7%AB%AF&tag=%E8%B7%AF%E7%94%B1");
  assert.deepEqual(parseDiscoveryFilters("?type=unknown&tag=&tag=valid"), { type: null, tags: ["valid"] });
});

test("history entries preserve filters, public results and exact list position", () => {
  const snapshot = {
    filters: { type: null, tags: ["路由"] },
    records,
    contentRevision: `sha256:${"a".repeat(64)}`,
  } as const;
  const entry = createDiscoveryEntry(snapshot, 428);
  const merged = mergeDiscoveryHistoryState({ next: { preserved: true } }, entry);
  assert.deepEqual(merged.next, { preserved: true });
  assert.deepEqual(readDiscoveryEntry(merged.daytraceDiscovery), entry);
});

test("history restoration rejects malformed or non-public payloads", () => {
  assert.equal(readDiscoveryEntry(null), null);
  assert.equal(readDiscoveryEntry({ snapshot: {}, scrollY: 0 }), null);
  const entry = createDiscoveryEntry({ filters: { type: null, tags: [] }, records, contentRevision: null }, 10);
  const tampered = structuredClone(entry) as unknown as {
    snapshot: { records: { items: { visibility: string }[] } };
  };
  tampered.snapshot.records.items[0]!.visibility = "private";
  assert.equal(readDiscoveryEntry(tampered), null);
});
