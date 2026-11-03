import assert from "node:assert/strict";
import { test } from "node:test";
import { getAllPublicRecords, PublicApiError } from "@daytrace/content/public-api";
import type { RecordListData, RecordSummary } from "@daytrace/contracts";
import { escapeXml } from "../../../apps/site/src/app/rss.xml/route";

const record: RecordSummary = {
  id: "rec_11111111-1111-4111-8111-000000000001",
  type: "engineering",
  title: "公开记录",
  slug: "public-record",
  oldSlugs: [],
  occurredOn: "2026-11-01",
  updatedAt: "2026-11-02T00:00:00.000Z",
  revision: 1,
  tags: [],
  summary: null,
  status: "published",
  visibility: "public",
};

function page(items: readonly RecordSummary[], nextCursor: string | null): RecordListData {
  return { items, pageInfo: { hasMore: nextCursor !== null, nextCursor } };
}

test("public aggregation follows every cursor and preserves the public projection", async () => {
  const cursors: Array<string | undefined> = [];
  const records = await getAllPublicRecords(async (cursor) => {
    cursors.push(cursor);
    return cursor === undefined ? page([record], "second") : page([{ ...record, id: "rec_11111111-1111-4111-8111-000000000002" }], null);
  });
  assert.deepEqual(cursors, [undefined, "second"]);
  assert.deepEqual(records.map(item => item.id), [record.id, "rec_11111111-1111-4111-8111-000000000002"]);
  assert.ok(records.every(item => item.status === "published" && item.visibility === "public"));
});

test("public aggregation rejects a repeated cursor instead of looping forever", async () => {
  await assert.rejects(
    getAllPublicRecords(async () => page([record], "repeated")),
    (error: unknown) => error instanceof PublicApiError && error.code === "CONTRACT_INVALID",
  );
});

test("RSS text escapes markup without double escaping existing input", () => {
  assert.equal(escapeXml(`技术 & <生活> "随想" '笔记'`), "技术 &amp; &lt;生活&gt; &quot;随想&quot; &apos;笔记&apos;");
});
