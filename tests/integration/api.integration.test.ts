import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import {
  parseApiErrorResponse,
  parsePublicTagsResponse,
  parseRecordDetailResponse,
  parseRecordListResponse,
} from "@daytrace/contracts";
import { ContentService } from "../../apps/api/src/modules/content/content.service";
import { createApiApplication } from "../../apps/api/src/bootstrap";

const fixtureRoot = resolve(process.cwd(), "apps/api/fixtures/content");
const recordId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111";
const privateId = "rec_7d0c0f2d-8f5b-4f0e-a3a6-555555555555";
const assetId = "ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444";
let app: INestApplication;
let origin: string;

before(async () => {
  app = await createApiApplication(fixtureRoot);
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  assert.ok(address && typeof address === "object");
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await app?.close();
});

test("real Nest HTTP list and detail satisfy the shared runtime contract", async () => {
  const listResponse = await fetch(`${origin}/api/v1/records`, {
    headers: { "x-request-id": "integration-list-001" },
  });
  assert.equal(listResponse.status, 200, await listResponse.clone().text());
  assert.equal(listResponse.headers.get("x-request-id"), "integration-list-001");
  const list = parseRecordListResponse(await listResponse.json());
  assert.equal(list.data.items.length, 1);
  assert.equal(list.data.items[0]?.id, recordId);
  assert.equal(list.meta.contentRevision.startsWith("sha256:"), true);
  assert.ok(!JSON.stringify(list).includes("PRIVATE_"));
  assert.ok(!JSON.stringify(list).includes("DRAFT_"));

  const detailResponse = await fetch(`${origin}/api/v1/records/${recordId}`);
  assert.equal(detailResponse.status, 200);
  const detail = parseRecordDetailResponse(await detailResponse.json());
  assert.ok(detail.data.body.html.includes("PUBLIC_SSR_PARAGRAPH_7F3A"));
  assert.ok(detail.data.body.html.includes(`/api/v1/assets/${assetId}`));
  assert.equal(detail.data.body.toc[0]?.id, "dt-从问题开始");
  assert.equal(detail.meta.contentRevision, list.meta.contentRevision);
  assert.deepEqual(detail.data.relatedRecords, []);
  assert.ok(!JSON.stringify(detail).includes(privateId));
  assert.ok(!JSON.stringify(detail).includes("DRAFT_TITLE_CANARY_77A1"));
});

test("public asset ID serves controlled bytes without a source path", async () => {
  const response = await fetch(`${origin}/api/v1/assets/${assetId}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.ok((await response.arrayBuffer()).byteLength > 0);
  const textResponse = await fetch(`${origin}/api/v1/assets/ast_7d0c0f2d-8f5b-4f0e-a3a6-666666666666`);
  assert.equal(textResponse.status, 200);
  assert.ok((await textResponse.text()).includes("SYNTHETIC_ATTACHMENT_CONTENT_91C2"));
});

test("private and draft records are indistinguishable from missing records", async () => {
  for (const id of [privateId, "rec_7d0c0f2d-8f5b-4f0e-a3a6-777777777777"]) {
    const response = await fetch(`${origin}/api/v1/records/${id}`);
    assert.equal(response.status, 404);
    const error = parseApiErrorResponse(await response.json());
    assert.equal(error.error.code, "RECORD_NOT_FOUND");
    assert.ok(!JSON.stringify(error).includes("CANARY"));
  }
  const privateAsset = await fetch(`${origin}/api/v1/assets/ast_7d0c0f2d-8f5b-4f0e-a3a6-555555555555`);
  assert.equal(privateAsset.status, 404);
  assert.equal((parseApiErrorResponse(await privateAsset.json())).error.code, "ASSET_NOT_FOUND");
});

test("invalid public snapshot returns located 503 errors, never an empty list", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "daytrace-api-"));
  let brokenApp: INestApplication | undefined;
  try {
    await cp(fixtureRoot, temporary, { recursive: true });
    const file = join(temporary, "public/draft-note/index.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("visibility: public\n", ""));
    brokenApp = await createApiApplication(temporary);
    await brokenApp.listen(0, "127.0.0.1");
    const address = brokenApp.getHttpServer().address();
    assert.ok(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/records`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const payload = parseApiErrorResponse(await response.json());
    const tagFailure = await fetch(`http://127.0.0.1:${address.port}/api/v1/records/tags`);
    assert.equal(tagFailure.status, 503);
    assert.equal(parseApiErrorResponse(await tagFailure.json()).error.code, "CONTENT_SNAPSHOT_INVALID");
    assert.equal(payload.error.code, "CONTENT_SNAPSHOT_INVALID");
    assert.equal(response.headers.get("x-request-id"), payload.error.requestId);
    assert.ok(payload.error.details.some((detail) =>
      detail.code === "CONTENT_VISIBILITY_MISSING" &&
      detail.file === "public/draft-note/index.md" &&
      detail.field === "visibility"
    ));
    const serialized = JSON.stringify(payload);
    assert.ok(!serialized.includes("stack"));
    assert.ok(!serialized.includes(temporary));
  } finally {
    await brokenApp?.close();
    await rm(temporary, { recursive: true, force: true });
  }
});

test("tag aggregation includes later public records, excludes private and draft tags, and tracks snapshot updates", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "daytrace-public-tags-"));
  let tagsApp: INestApplication | undefined;
  try {
    for (const group of ["public", "private"]) await mkdir(join(temporary, group));
    const source = (i: number, tag: string, status = "published", visibility = "public") => `---\nschemaVersion: 1\nid: rec_11111111-1111-4111-8111-${String(i).padStart(12, "0")}\ntype: engineering\ntitle: 合成 ${i}\nslug: synthetic-${i}\noldSlugs: []\noccurredOn: 2026-01-01\nupdatedAt: "2026-01-01T00:00:00.000Z"\nrevision: 1\ntags: ${tag ? `[${tag}]` : "[]"}\nsummary: null\nstatus: ${status}\nvisibility: ${visibility}\nattachments: []\n---\n\n合成内容。\n`;
    for (let i = 0; i < 55; i++) {
      const dir = join(temporary, "public", `record-${i}`); await mkdir(dir);
      await writeFile(join(dir, "index.md"), source(i, i === 54 ? "末页标签" : ""));
    }
    for (const [group, id, tag, status, visibility] of [["private", 100, "私密标签", "published", "private"], ["public", 101, "草稿标签", "draft", "private"]] as const) {
      const dir = join(temporary, group, `record-${id}`); await mkdir(dir); await writeFile(join(dir, "index.md"), source(id, tag, status, visibility));
    }
    tagsApp = await createApiApplication(temporary); await tagsApp.listen(0, "127.0.0.1");
    const url = `http://127.0.0.1:${tagsApp.getHttpServer().address().port}/api/v1/records/tags`;
    const firstResponse = await fetch(url, { headers: { cookie: "__Host-daytrace_session=irrelevant" } });
    assert.equal(firstResponse.status, 200);
    const first = parsePublicTagsResponse(await firstResponse.json());
    assert.deepEqual(first.data.tags, ["末页标签"]);
    await writeFile(join(temporary, "public/record-54/index.md"), source(54, "更新标签"));
    await tagsApp.get(ContentService).initialize();
    const next = parsePublicTagsResponse(await (await fetch(url)).json());
    assert.deepEqual(next.data.tags, ["更新标签"]);
    assert.notEqual(next.meta.contentRevision, first.meta.contentRevision);
    await writeFile(join(temporary, "public/record-54/index.md"), source(54, ""));
    await tagsApp.get(ContentService).initialize();
    assert.deepEqual(parsePublicTagsResponse(await (await fetch(url)).json()).data.tags, []);
  } finally { await tagsApp?.close(); await rm(temporary, { recursive: true, force: true }); }
});
