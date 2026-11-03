import "reflect-metadata";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createApiApplication } from "../../../apps/api/src/bootstrap";

const PRIVATE_ID = "rec_00000000-0000-4000-8000-000000000501";
const DRAFT_ID = "rec_00000000-0000-4000-8000-000000000502";
const PRIVATE_CANARY = "PRIVATE_OWNER_SEARCH_CANARY_5B11";

let root: string;
let app: INestApplication;
let origin: string;
let session: string;

function markdown(record: {
  id: string;
  title: string;
  slug: string;
  status?: string;
  visibility?: string;
  body: string;
  relatedRecords?: readonly string[];
}): string {
  return `---\nschemaVersion: 1\nid: ${record.id}\ntype: reflection\ntitle: ${record.title}\nslug: ${record.slug}\noldSlugs: []\noccurredOn: 2026-11-03\nupdatedAt: "2026-11-03T09:30:00+08:00"\nrevision: 1\ntags: [主人, 检索]\nsummary: null\nstatus: ${record.status ?? "published"}\nvisibility: ${record.visibility ?? "private"}${record.relatedRecords ? `\nrelatedRecords: [${record.relatedRecords.join(", ")}]` : ""}\nattachments: []\n---\n\n## 合成主人检索样本\n\n${record.body}\n`;
}

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

function cookie(setCookies: readonly string[], name: string): string | null {
  const prefix = `${name}=`;
  const value = setCookies.find((entry) => entry.startsWith(prefix));
  return value === undefined ? null : value.slice(prefix.length).split(";", 1)[0] ?? null;
}

async function login(): Promise<string> {
  const start = await fetch(`${origin}/api/v1/auth/login?returnTo=%2Fowner`, { redirect: "manual" });
  assert.equal(start.status, 302);
  const transaction = cookie(start.headers.getSetCookie(), "__Host-daytrace_login");
  const location = start.headers.get("location");
  assert.ok(transaction && location);
  const callback = await fetch(location, {
    redirect: "manual",
    headers: { cookie: `__Host-daytrace_login=${transaction}` },
  });
  assert.equal(callback.status, 302);
  const token = cookie(callback.headers.getSetCookie(), "__Host-daytrace_session");
  assert.ok(token);
  return token;
}

before(async () => {
  root = await mkdtemp(join(tmpdir(), "daytrace-owner-search-"));
  await mkdir(join(root, "public", "public-note"), { recursive: true });
  await mkdir(join(root, "private", "private-note"), { recursive: true });
  await mkdir(join(root, "private", "draft-note"), { recursive: true });
  await writeFile(join(root, "public", "public-note", "index.md"), markdown({
    id: "rec_00000000-0000-4000-8000-000000000101",
    title: "公开的主人检索样本",
    slug: "public-owner-search",
    visibility: "public",
    relatedRecords: [PRIVATE_ID, DRAFT_ID],
    body: "这里只有公开正文。",
  }));
  await writeFile(join(root, "private", "private-note", "index.md"), markdown({
    id: PRIVATE_ID,
    title: `私密记录 ${PRIVATE_CANARY}`,
    slug: "private-owner-search",
    body: "主人正文中的 registerMicroApps 排查记录。",
  }));
  await writeFile(join(root, "private", "draft-note", "index.md"), markdown({
    id: DRAFT_ID,
    title: "尚未整理的主人草稿",
    slug: "draft-owner-search",
    status: "draft",
    body: `草稿中的 ${PRIVATE_CANARY} 只能由主人看到。`,
  }));
  const port = await availablePort();
  origin = `http://127.0.0.1:${port}`;
  app = await createApiApplication(root, false, origin);
  await app.listen(port, "127.0.0.1");
  session = await login();
});

after(async () => {
  await app?.close();
  await rm(root, { recursive: true, force: true });
});

test("visitor cannot search owner scope and public scope ignores the owner cookie", async () => {
  const denied = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent("主人")}&scope=owner`);
  assert.equal(denied.status, 401);
  assert.match(denied.headers.get("cache-control") ?? "", /no-store/);

  const response = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent(PRIVATE_CANARY)}`, {
    headers: { cookie: `__Host-daytrace_session=${session}` },
  });
  assert.equal(response.status, 200);
  const payload = await response.json() as { data: { items: unknown[] } };
  assert.deepEqual(payload.data.items, []);
  assert.ok(!JSON.stringify(payload).includes(PRIVATE_CANARY));
});

test("owner search reads private title tag and body only after authorization", async () => {
  for (const query of [PRIVATE_CANARY, "主人", "registerMicroApps"]) {
    const response = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent(query)}&scope=owner`, {
      headers: { cookie: `__Host-daytrace_session=${session}` },
    });
    assert.equal(response.status, 200, await response.clone().text());
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const payload = await response.json() as {
      data: { items: Array<{ record: { id: string } }> };
      meta: { contentRevision: string };
    };
    assert.ok(payload.data.items.some((item) => item.record.id === PRIVATE_ID));
    assert.match(payload.meta.contentRevision, /^sha256:[0-9a-f]{64}$/);
  }
});

test("owner status and visibility filters include drafts without changing public results", async () => {
  const params = new URLSearchParams({ q: PRIVATE_CANARY, scope: "owner", status: "draft", visibility: "private" });
  const response = await fetch(`${origin}/api/v1/search?${params}`, {
    headers: { cookie: `__Host-daytrace_session=${session}` },
  });
  assert.equal(response.status, 200);
  const payload = await response.json() as { data: { items: Array<{ record: { id: string; status: string } }> } };
  assert.deepEqual(payload.data.items.map((item) => item.record.id), [DRAFT_ID]);
  assert.equal(payload.data.items[0]?.record.status, "draft");

  const publicResponse = await fetch(`${origin}/api/v1/search?q=${encodeURIComponent(PRIVATE_CANARY)}`);
  const publicPayload = await publicResponse.json() as { data: { items: unknown[] } };
  assert.deepEqual(publicPayload.data.items, []);
});


test("record details project forward and reverse relations only within caller authority", async () => {
  const publicId = "rec_00000000-0000-4000-8000-000000000101";
  const publicResponse = await fetch(`${origin}/api/v1/records/${publicId}`);
  assert.equal(publicResponse.status, 200);
  const publicText = await publicResponse.text();
  assert.ok(!publicText.includes(PRIVATE_ID));
  assert.ok(!publicText.includes(PRIVATE_CANARY));
  const ownerResponse = await fetch(`${origin}/api/v1/records/${publicId}?scope=owner`, { headers: { cookie: `__Host-daytrace_session=${session}` } });
  assert.equal(ownerResponse.status, 200);
  const ownerDetail = await ownerResponse.json() as { data: { relatedRecords: { id: string }[] } };
  assert.deepEqual(ownerDetail.data.relatedRecords.map(item => item.id), [PRIVATE_ID, DRAFT_ID]);
  const reverseResponse = await fetch(`${origin}/api/v1/records/${PRIVATE_ID}?scope=owner`, { headers: { cookie: `__Host-daytrace_session=${session}` } });
  const reverseDetail = await reverseResponse.json() as { data: { relatedRecords: { id: string }[] } };
  assert.deepEqual(reverseDetail.data.relatedRecords.map(item => item.id), [publicId]);
});
