import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { zipSync, unzipSync } from "fflate";
import { createApiApplication } from "../../bootstrap";
import { ContentService } from "../content/content.service";
import { ContentManagementService } from "./content-management.service";
import { SessionService, SYNTHETIC_ISSUER } from "../auth";
import type { INestApplication } from "@nestjs/common";

let app: INestApplication; let root: string; let origin: string; let cookie: string; let token: string;
const publicOrigin = "http://127.0.0.1:3000";
before(async () => {
  root = await mkdtemp(join(tmpdir(), "daytrace-manage-"));
  await cp(resolve("apps/api/fixtures/content"), root, { recursive: true });
  app = await createApiApplication(root, false, publicOrigin); await app.listen(0, "127.0.0.1");
  origin = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
  const sessions = app.get(SessionService);
  const session = sessions.createSession({ issuer: SYNTHETIC_ISSUER, subject: "owner", authTime: Date.now() });
  cookie = `__Host-daytrace_session=${session.token}`;
  token = sessions.issueCsrf(session.session);
});
after(async () => { await app?.close(); await rm(root, { recursive: true, force: true }); });
const headers = () => ({ cookie, origin: publicOrigin, "x-csrf-token": token });
async function upload(files: Record<string, string | Buffer>, fields: Record<string,string> = {}) {
  const form = new FormData(); const paths = Object.keys(files);
  for (const [name, value] of Object.entries(files)) form.append("files", new Blob([Buffer.from(value)]), name.split("/").pop());
  form.set("paths", JSON.stringify(paths));
  for (const [key,value] of Object.entries(fields)) form.set(key,value);
  return fetch(`${origin}/owner/imports`, { method: "POST", headers: headers(), body: form });
}
async function write(path: string, body: unknown) {
  return fetch(`${origin}/owner/${path}`, { method: "POST", headers: { ...headers(), "content-type": "application/json" }, body: JSON.stringify(body) });
}
let id: string; let batch: any; let firstSnapshot: string;
test("management rejects missing sessions and cross-origin writes before file processing", async () => {
  assert.equal((await fetch(`${origin}/owner/content`)).status, 401);
  const denied = await fetch(`${origin}/owner/imports`, { method: "POST", headers: { cookie, origin: "http://evil.invalid", "x-csrf-token": token } });
  assert.equal(denied.status, 403);
  assert.match(denied.headers.get("cache-control") ?? "", /no-store/);
});
test("missing attachments and ZIP traversal never alter the live revision", async () => {
  const revision = app.get(ContentService).ownerContentRevision;
  assert.equal((await upload({ "bad.md": "# 缺图\n\n![图](missing.png)" })).status, 422);
  assert.equal((await upload({ "bad.zip": Buffer.from(zipSync({ "../outside.md": Buffer.from("# bad") })) })).status, 422);
  assert.equal(app.get(ContentService).ownerContentRevision, revision);
});
test("ordinary Markdown becomes private draft preview with declared attachments and does not change public content", async () => {
  const revision = app.get(ContentService).ownerContentRevision;
  const response = await upload({ "新文章.md": "# 上传试验\n\n## 观察\n\n一条说明[^n] 与 $x^2$。\n\n[清单](files/check.txt)\n\n[^n]: 合成材料", "files/check.txt": "SYNTHETIC_ATTACHMENT" }, { type: "reflection" });
  assert.equal(response.status, 201, await response.clone().text()); batch = await response.json(); id = batch.records[0].id;
  assert.equal(batch.records[0].status, "draft"); assert.equal(batch.records[0].visibility, "private");
  assert.match(batch.records[0].body.html, /katex/);
  assert.equal(app.get(ContentService).ownerContentRevision, revision);
  assert.equal((await fetch(`${origin}/records/${id}`)).status, 404);
  const asset = batch.records[0].attachments[0].id;
  assert.equal((await fetch(`${origin}/owner/imports/${batch.id}/assets/${asset}`)).status, 401);
  assert.equal(await (await fetch(`${origin}/owner/imports/${batch.id}/assets/${asset}`, { headers: { cookie } })).text(), "SYNTHETIC_ATTACHMENT");
});
test("explicit batch publish atomically updates direct aliases and search; retry is idempotent", async () => {
  const response = await write(`imports/${batch.id}/commit`, { baseRevision: batch.baseRevision, status: "published", visibility: "public" });
  assert.equal(response.status, 201, await response.clone().text()); firstSnapshot = (await response.json()).committed;
  assert.equal((await fetch(`${origin}/records/${id}`)).status, 200);
  const alias = await fetch(`${origin}/records/resolve/${batch.records[0].slug}`); assert.equal(alias.status, 200);
  const search = await fetch(`${origin}/search?q=${encodeURIComponent("上传试验")}`); assert.match(await search.text(), /上传试验/);
  assert.equal((await write(`imports/${batch.id}/commit`, { baseRevision: batch.baseRevision, status: "published", visibility: "public" })).status, 201);
});
test("export/update keep stable identity, stale uploads conflict and changing private revokes public assets and aliases", async () => {
  const exported = await fetch(`${origin}/owner/content/${id}/export`, { headers: { cookie } });
  assert.equal(exported.status, 200); const zip = Buffer.from(await exported.arrayBuffer());
  assert.ok(Object.keys(unzipSync(zip)).some(p => p.endsWith("/index.md")));
  const uploadAgain = await upload({ "export.zip": zip }); assert.equal(uploadAgain.status, 201);
  const updated = await uploadAgain.json(); assert.equal(updated.records[0].id, id);
  const before = app.get(ContentService).ownerContentRevision;
  const change = await write(`content/${id}`, { baseRevision: before, status: "published", visibility: "private", title: "上传试验第二版", slug: "updated-test", tags: ["测试"] });
  assert.equal(change.status, 201, await change.clone().text());
  assert.equal((await write(`imports/${updated.id}/commit`, { baseRevision: updated.baseRevision, status: "published", visibility: "public" })).status, 409);
  assert.equal((await upload({ "stale.zip": zip })).status, 409);
  assert.equal((await fetch(`${origin}/records/${id}`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/${batch.records[0].attachments[0].id}`)).status, 404);
  assert.equal((await fetch(`${origin}/records/resolve/${batch.records[0].slug}`)).status, 404);
  const history = await (await fetch(`${origin}/owner/content/${id}/history`, { headers: { cookie } })).json(); assert.ok(history.length >= 2);
  const restored = await write(`content/${id}`, { baseRevision: app.get(ContentService).ownerContentRevision, snapshot: firstSnapshot });
  assert.equal(restored.status, 201, await restored.clone().text()); assert.equal(app.get(ContentService).getOwnerRecord(id).metadata.visibility, "private");
});
test("persisted current snapshot survives API restart and draft assets stay owner-only", async () => {
  const content = new ContentService(root); await content.initialize();
  assert.equal(content.getOwnerRecord(id).metadata.visibility, "private");
  assert.equal(content.getOwnerRecord(id).metadata.revision, 3);
  const service = new ContentManagementService(content);
  const draft = await service.import([{ path: "draft.md", bytes: Buffer.from("# 草稿\n\n[资料](a.txt)") }, { path: "a.txt", bytes: Buffer.from("DRAFT_CANARY") }], {});
  await service.commit(draft.id, { baseRevision: draft.baseRevision, status: "draft", visibility: "private" });
  const r = content.getOwnerRecord(draft.records[0]!.id); assert.equal(r.metadata.status, "draft");
  assert.equal(content.findPublishedAsset(r.metadata.attachments[0]!.id)?.visibility, "private");
});

test("batch relative article links and resource names normalize together; duplicate input is located", async () => {
  const content = app.get(ContentService); const service = new ContentManagementService(content);
  const input = [
    { path: "trip/first.md", bytes: Buffer.from("# 行程甲\n\n[接着读](second.md#观察)\n\n![图](images/a.png)") },
    { path: "trip/second.md", bytes: Buffer.from("# 行程乙\n\n## 观察\n\n合成观察") },
    { path: "trip/images/a.png", bytes: Buffer.from([137,80,78,71,13,10,26,10]) },
  ];
  const preview = await service.import(input, { type: "reflection" });
  const first = preview.records.find(r => r.title === "行程甲")!;
  const second = preview.records.find(r => r.title === "行程乙")!;
  assert.match(first.body.html, new RegExp(`/records/${second.id}/#dt-`));
  await service.commit(preview.id, { baseRevision: preview.baseRevision, status: "published", visibility: "public" });
  await assert.rejects(service.import(input, {}), /相同文件已导入/);
});

test("bad signatures, malformed metadata, invalid state and cross-article leaks never replace a published snapshot", async () => {
  const service = new ContentManagementService(app.get(ContentService));
  const before = service.content.ownerContentRevision;
  await assert.rejects(service.import([{ path: "x.md", bytes: Buffer.from("# 图片\n\n![图](x.png)") }, { path: "x.png", bytes: Buffer.from("not a PNG") }], {}), /扩展名不符/);
  await assert.rejects(service.import([{ path: "x.md", bytes: Buffer.from("---\noldSlugs: wrong\n---\n内容") }], {}), /oldSlugs/);
  const preview = await service.import([{ path: "cross.md", bytes: Buffer.from(`# 关联私密文章\n\n[一个页面](/records/${id}/)`) }], {});
  await assert.rejects(service.commit(preview.id, { baseRevision: preview.baseRevision, status: "draft", visibility: "public" }), /草稿/);
  await assert.rejects(service.commit(preview.id, { baseRevision: preview.baseRevision, status: "published", visibility: "public" }), /未公开/);
  assert.equal(service.content.ownerContentRevision, before);
});

test("unexpected multipart fields produce a stable input error", async () => {
  const form = new FormData(); form.append("unexpected", new Blob(["# 错误字段"]), "x.md");
  const response = await fetch(`${origin}/owner/imports`, { method: "POST", headers: headers(), body: form });
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error.code, "CONTENT_IMPORT_INVALID");
});
