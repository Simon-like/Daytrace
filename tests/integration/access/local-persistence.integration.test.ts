import assert from "node:assert/strict";
import { test } from "node:test";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createApiApplication } from "../../../apps/api/src/bootstrap";
import { SyntheticOidcProvider, SYNTHETIC_ISSUER } from "../../../apps/api/src/modules/auth";

const publicOrigin = "http://127.0.0.1:3000";
function cookieValue(response: Response, name: string): string {
  const value = response.headers.getSetCookie().find(entry => entry.startsWith(`${name}=`));
  assert.ok(value);
  return value.split(";", 1)[0]!;
}

test("HTTP login, private import and persistent session survive a Nest restart", async () => {
  const root = await mkdtemp(join(tmpdir(), "daytrace-local-persistence-"));
  const contentRoot = join(root, "content");
  await cp(resolve("apps/api/fixtures/content"), contentRoot, { recursive: true });
  const auth = { environment: "test" as const, publicOrigin, databasePath: join(root, "sessions.sqlite"), ownerIdentities: [{ issuer: SYNTHETIC_ISSUER, subject: "owner" }], provider: new SyntheticOidcProvider() };
  let app: Awaited<ReturnType<typeof createApiApplication>> | undefined;
  try {
    app = await createApiApplication(contentRoot, false, undefined, auth);
    await app.listen(0, "127.0.0.1");
    let origin = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    const start = await fetch(`${origin}/api/v1/auth/login?returnTo=/owner`, { redirect: "manual" });
    assert.equal(start.status, 302);
    const loginCookie = cookieValue(start, "__Host-daytrace_login");
    const callback = new URL(start.headers.get("location")!);
    const finish = await fetch(`${origin}${callback.pathname}${callback.search}`, { headers: { cookie: loginCookie }, redirect: "manual" });
    assert.equal(finish.status, 302);
    const cookie = cookieValue(finish, "__Host-daytrace_session");
    const csrfResponse = await fetch(`${origin}/api/v1/auth/csrf`, { headers: { cookie } });
    assert.equal(csrfResponse.status, 200);
    const csrf = (await csrfResponse.json()).csrfToken as string;
    const form = new FormData();
    form.append("files", new Blob(["# 持久草稿\n\nSYNTHETIC_LOCAL_PERSISTENCE_CANARY"]), "draft.md");
    form.set("paths", JSON.stringify(["draft.md"]));
    const headers = { cookie, origin: publicOrigin, "x-csrf-token": csrf };
    const uploaded = await fetch(`${origin}/api/v1/owner/imports`, { method: "POST", headers, body: form });
    assert.equal(uploaded.status, 201, await uploaded.clone().text());
    const batch = await uploaded.json() as { id: string; baseRevision: string; records: { id: string }[] };
    const id = batch.records[0]!.id;
    const saved = await fetch(`${origin}/api/v1/owner/imports/${batch.id}/commit`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ baseRevision: batch.baseRevision, status: "draft", visibility: "private" }) });
    assert.equal(saved.status, 201, await saved.clone().text());
    await app.close();
    app = await createApiApplication(contentRoot, false, undefined, auth);
    await app.listen(0, "127.0.0.1");
    origin = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    const owner = await fetch(`${origin}/api/v1/records/${id}?scope=owner`, { headers: { cookie } });
    assert.equal(owner.status, 200);
    assert.match(await owner.text(), /SYNTHETIC_LOCAL_PERSISTENCE_CANARY/);
    assert.equal((await fetch(`${origin}/api/v1/records/${id}`)).status, 404);
    assert.equal((await fetch(`${origin}/api/v1/records/${id}?scope=owner`)).status, 401);
  } finally {
    await app?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("development OIDC allows only an explicitly configured same-host H5 write origin", async () => {
  const { authOptionsFromEnvironment } = await import("../../../apps/api/src/modules/auth/auth.config");
  const { AuthModule } = await import("../../../apps/api/src/modules/auth/auth.module");
  const root = await mkdtemp(join(tmpdir(), "daytrace-local-oidc-"));
  const contentRoot = join(root, "content");
  await cp(resolve("apps/api/fixtures/content"), contentRoot, { recursive: true });
  const issuer = "https://synthetic-tenant.invalid/";
  const env = {
    NODE_ENV: "development", AUTH_PROVIDER: "auth0", PUBLIC_ORIGIN: "http://127.0.0.1:3210", LOCAL_H5_ORIGIN: "http://127.0.0.1:3212",
    SESSION_DATABASE_PATH: join(root, "sessions.sqlite"), OWNER_IDENTITIES: JSON.stringify([{ issuer, subject: "owner" }]),
    AUTH0_ISSUER: issuer, AUTH0_CLIENT_ID: "synthetic", AUTH0_CLIENT_SECRET: "synthetic",
  };
  const client = {
    authorizationUrl: (_configuration: unknown, request: { redirectUri: string; state: string }) => {
      const url = new URL(request.redirectUri); url.searchParams.set("code", "test-code"); url.searchParams.set("state", request.state); return url;
    },
    verifyCallback: async () => ({ issuer, subject: "owner", authTime: Math.floor(Date.now() / 1000) }),
  };
  let app: Awaited<ReturnType<typeof createApiApplication>> | undefined;
  try {
    const options = authOptionsFromEnvironment(env, client);
    assert.deepEqual(options.additionalWriteOrigins, [env.LOCAL_H5_ORIGIN]);
    assert.equal(authOptionsFromEnvironment({ ...env, LOCAL_H5_ORIGIN: undefined }, client).additionalWriteOrigins, undefined);
    for (const invalid of ["http://localhost:3212", "http://192.0.2.1:3212", "https://127.0.0.1:3212", "http://127.0.0.1:3212/path"]) {
      assert.throws(() => authOptionsFromEnvironment({ ...env, LOCAL_H5_ORIGIN: invalid }, client));
    }
    assert.throws(() => authOptionsFromEnvironment({ ...env, PUBLIC_ORIGIN: "http://192.0.2.1:3210", LOCAL_H5_ORIGIN: undefined }, client), /loopback/);
    assert.throws(() => authOptionsFromEnvironment({ ...env, NODE_ENV: "production", PUBLIC_ORIGIN: "https://example.test" }, client), /restricted/);
    assert.throws(() => AuthModule.register({ ...options, additionalWriteOrigins: ["http://evil.invalid:3212"] }), /loopback/);
    assert.throws(() => AuthModule.register({ ...options, environment: "production", publicOrigin: "https://example.test" }), /forbidden/);
    app = await createApiApplication(contentRoot, false, undefined, options);
    await app.listen(0, "127.0.0.1");
    const origin = `http://127.0.0.1:${app.getHttpServer().address().port}`;
    const start = await fetch(`${origin}/api/v1/auth/login`, { redirect: "manual" });
    const callback = new URL(start.headers.get("location")!);
    const finish = await fetch(`${origin}${callback.pathname}${callback.search}`, { redirect: "manual", headers: { cookie: cookieValue(start, "__Host-daytrace_login") } });
    assert.equal(finish.status, 302);
    const cookie = cookieValue(finish, "__Host-daytrace_session");
    const csrf = (await (await fetch(`${origin}/api/v1/auth/csrf`, { headers: { cookie } })).json()).csrfToken as string;
    const form = new FormData(); form.append("files", new Blob(["# 本地合成\n\n内容。"]), "local.md"); form.set("paths", JSON.stringify(["local.md"]));
    const headers = { cookie, "x-csrf-token": csrf };
    const denied = await fetch(`${origin}/api/v1/owner/imports`, { method: "POST", headers: { ...headers, origin: "http://127.0.0.1:3999" }, body: form });
    assert.equal(denied.status, 403);
    const preview = await fetch(`${origin}/api/v1/owner/imports`, { method: "POST", headers: { ...headers, origin: env.LOCAL_H5_ORIGIN }, body: form });
    assert.equal(preview.status, 201, await preview.clone().text());
    const batch = await preview.json() as { id: string; baseRevision: string; records: { id: string }[] };
    const saved = await fetch(`${origin}/api/v1/owner/imports/${batch.id}/commit`, { method: "POST", headers: { ...headers, origin: env.PUBLIC_ORIGIN, "content-type": "application/json" }, body: JSON.stringify({ baseRevision: batch.baseRevision, status: "draft", visibility: "private" }) });
    assert.equal(saved.status, 201, await saved.clone().text());
    assert.equal((await fetch(`${origin}/api/v1/records/${batch.records[0]!.id}`)).status, 404);
  } finally { await app?.close(); await rm(root, { recursive: true, force: true }); }
});
