import "reflect-metadata";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { parseApiErrorResponse } from "@daytrace/contracts";
import { ApiErrorFilter } from "../../../apps/api/src/common/api-error.filter";
import { RequestIdMiddleware } from "../../../apps/api/src/common/request-id.middleware";
import { ContentModule } from "../../../apps/api/src/modules/content/content.module";
import { SearchModule } from "../../../apps/api/src/modules/search/search.module";
import { parsePublicSearchResponse } from "../../../apps/site/src/features/search/search-contract";

let root: string;
let app: INestApplication;
let origin: string;

const publicRecords = [
  {
    directory: "microfrontend",
    id: "rec_00000000-0000-4000-8000-000000000101",
    type: "engineering",
    title: "微前端主子应用的路由排查",
    slug: "microfrontend-routing",
    tags: "[微前端, 路由]",
    body: "先核对入口与 basename，再检查 `registerMicroApps` 的注册顺序。",
  },
  {
    directory: "tofu",
    id: "rec_00000000-0000-4000-8000-000000000102",
    type: "recipe",
    title: "麻婆豆腐的这次调整",
    slug: "mapo-tofu",
    tags: "[菜谱, 豆腐]",
    body: "这次实际减少了豆瓣酱用量，下次继续记录豆腐口感。",
  },
] as const;

function markdown(record: {
  id: string;
  type: string;
  title: string;
  slug: string;
  tags: string;
  body: string;
  status?: string;
  visibility?: string;
}): string {
  return `---\nschemaVersion: 1\nid: ${record.id}\ntype: ${record.type}\ntitle: ${record.title}\nslug: ${record.slug}\noldSlugs: []\noccurredOn: 2026-10-29\nupdatedAt: "2026-10-30T09:30:00+08:00"\nrevision: 1\ntags: ${record.tags}\nsummary: null\nstatus: ${record.status ?? "published"}\nvisibility: ${record.visibility ?? "public"}\nattachments: []\n---\n\n## 合成检索样本\n\n${record.body}\n`;
}

async function createApplication(contentRoot: string): Promise<{ app: INestApplication; origin: string }> {
  const application = await NestFactory.create(
    SearchModule.register(ContentModule.register(contentRoot)),
    new ExpressAdapter(),
    { logger: ["error"] },
  );
  const requestId = new RequestIdMiddleware();
  application.use((request: Request, response: Response, next: NextFunction) => requestId.use(request, response, next));
  application.setGlobalPrefix("api/v1");
  application.useGlobalFilters(new ApiErrorFilter());
  await application.init();
  await application.listen(0, "127.0.0.1");
  const address = application.getHttpServer().address();
  assert.ok(address && typeof address === "object");
  return { app: application, origin: `http://127.0.0.1:${address.port}` };
}

before(async () => {
  root = await mkdtemp(join(tmpdir(), "daytrace-find-"));
  await mkdir(join(root, "public"), { recursive: true });
  await mkdir(join(root, "private"), { recursive: true });
  for (const record of publicRecords) {
    await mkdir(join(root, "public", record.directory));
    await writeFile(join(root, "public", record.directory, "index.md"), markdown(record));
  }
  await mkdir(join(root, "private", "canary"));
  await writeFile(join(root, "private", "canary", "index.md"), markdown({
    id: "rec_00000000-0000-4000-8000-000000000501",
    type: "reflection",
    title: "PRIVATE_TITLE_CANARY_FIND001",
    slug: "private-find-canary",
    tags: "[微前端, 豆腐]",
    body: "PRIVATE_BODY_CANARY_FIND001 registerMicroApps",
    visibility: "private",
  }));
  const created = await createApplication(root);
  app = created.app;
  origin = created.origin;
});

after(async () => {
  await app?.close();
  await rm(root, { recursive: true, force: true });
});

test("fixed Chinese and technical queries return public title/tag/body matches with stable metadata", async () => {
  for (const [query, expectedId] of [
    ["微前端", publicRecords[0].id],
    ["豆腐", publicRecords[1].id],
    ["registerMicroApps", publicRecords[0].id],
  ] as const) {
    const response = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent(query)}`, {
      headers: { "x-request-id": `find-${query.length}-001`, cookie: "__Host-daytrace_session=visitor-cookie-must-not-change-public-scope" },
    });
    assert.equal(response.status, 200, await response.clone().text());
    const payload = parsePublicSearchResponse(await response.json());
    assert.equal(payload.data.items[0]?.record.id, expectedId);
    assert.equal(payload.meta.requestId, response.headers.get("x-request-id"));
    assert.match(payload.meta.contentRevision, /^sha256:[0-9a-f]{64}$/);
    const serialized = JSON.stringify(payload);
    assert.ok(!serialized.includes("PRIVATE_"));
    assert.ok(!serialized.includes("private-find-canary"));
  }
});

test("public scope ignores cookies for collection membership and never leaks the private canary", async () => {
  const response = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent("PRIVATE_TITLE_CANARY_FIND001")}`, {
    headers: { cookie: "__Host-daytrace_session=not-an-authorization-mechanism" },
  });
  assert.equal(response.status, 200);
  const payload = await response.json() as { data: { items: unknown[] } };
  assert.deepEqual(payload.data.items, []);
  assert.ok(!JSON.stringify(payload).includes("PRIVATE_"));
});

test("empty results, invalid queries and owner authorization are distinct responses", async () => {
  const empty = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent("完全不存在的词")}`);
  assert.equal(empty.status, 200);
  assert.deepEqual((await empty.json() as { data: { items: unknown[] } }).data.items, []);

  const invalid = await fetch(`${origin}/api/v1/search?q=%20%20`);
  assert.equal(invalid.status, 400);
  assert.equal(parseApiErrorResponse(await invalid.json()).error.code, "INVALID_QUERY");

  const owner = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent("豆腐")}&scope=owner`, {
    headers: { cookie: "__Host-daytrace_session=unverified" },
  });
  assert.equal(owner.status, 401);
  assert.equal(owner.headers.get("cache-control"), "no-store");
  const ownerError = parseApiErrorResponse(await owner.json());
  assert.equal(ownerError.error.code, "AUTH_REQUIRED");
  assert.equal(ownerError.error.requestId, owner.headers.get("x-request-id"));
  assert.ok(!JSON.stringify(ownerError).includes("PRIVATE_"));
});

test("broken content snapshot returns a located 503 instead of an empty search page", async () => {
  const brokenRoot = await mkdtemp(join(tmpdir(), "daytrace-find-broken-"));
  let brokenApp: INestApplication | undefined;
  try {
    await mkdir(join(brokenRoot, "public", "broken"), { recursive: true });
    await mkdir(join(brokenRoot, "private"), { recursive: true });
    const valid = markdown(publicRecords[0]!);
    await writeFile(join(brokenRoot, "public", "broken", "index.md"), valid.replace("visibility: public\n", ""));
    const created = await createApplication(brokenRoot);
    brokenApp = created.app;
    const response = await fetch(`${created.origin}/api/v1/search?q=${encodeURIComponent("微前端")}`);
    assert.equal(response.status, 503);
    const error = parseApiErrorResponse(await response.json());
    assert.equal(error.error.code, "CONTENT_SNAPSHOT_INVALID");
    assert.ok(error.error.details.some((detail) => detail.code === "CONTENT_VISIBILITY_MISSING"));
    assert.equal(error.error.requestId, response.headers.get("x-request-id"));
  } finally {
    await brokenApp?.close();
    await rm(brokenRoot, { recursive: true, force: true });
  }
});
