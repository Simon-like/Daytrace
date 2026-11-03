import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import {
  parseApiErrorResponse,
  parseRecordDetailResponse,
  parseRecordListResponse,
} from "@daytrace/contracts";
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
