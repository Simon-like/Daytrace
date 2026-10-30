import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  authOptionsFromEnvironment,
  SYNTHETIC_ISSUER,
} from "../../../apps/api/src/modules/auth";
import { safeReturnTo } from "../../../apps/api/src/modules/auth/auth.controller";
import {
  assertNoStore,
  createHarness,
  csrf,
  ESCAPE_ASSET_ID,
  login,
  OUTSIDE_CANARY,
  ownerLogin,
  PRIVATE_ASSET_ID,
  PRIVATE_CANARY,
  PRIVATE_ID,
  PUBLIC_ASSET_ID,
  sessionHeader,
  SYMLINK_ASSET_ID,
} from "./support";

test("production config fails closed and synthetic login is test-only", () => {
  assert.throws(() => authOptionsFromEnvironment({ NODE_ENV: "production" }));
  assert.throws(() => authOptionsFromEnvironment({
    NODE_ENV: "production",
    AUTH_PROVIDER: "synthetic",
    ALLOW_SYNTHETIC_AUTH: "true",
    PUBLIC_ORIGIN: "https://daytrace.example",
    SESSION_DATABASE_PATH: "/tmp/synthetic-only-test.sqlite",
    OWNER_IDENTITIES: JSON.stringify([{ issuer: SYNTHETIC_ISSUER, subject: "owner" }]),
  }));
  assert.throws(() => authOptionsFromEnvironment({
    NODE_ENV: "production",
    AUTH_PROVIDER: "auth0",
    PUBLIC_ORIGIN: "https://daytrace.example",
    SESSION_DATABASE_PATH: ":memory:",
    OWNER_IDENTITIES: JSON.stringify([{ issuer: "https://tenant.example/", subject: "owner" }]),
    AUTH0_ISSUER: "https://tenant.example/",
    AUTH0_CLIENT_ID: "synthetic-client",
    AUTH0_CLIENT_SECRET: "synthetic-not-a-real-secret",
  }));
});

test("visitor receives no private body, metadata, asset, or cacheable response", async () => {
  const harness = await createHarness();
  try {
    for (const [path, status] of [
      ["/api/v1/records?scope=owner", 401],
      [`/api/v1/records/${PRIVATE_ID}?scope=owner`, 404],
      [`/api/v1/assets/${PRIVATE_ASSET_ID}`, 404],
    ] as const) {
      const response = await fetch(`${harness.origin}${path}`);
      assert.equal(response.status, status);
      assertNoStore(response);
      const body = await response.text();
      assert.ok(!body.includes("PRIVATE_"));
      assert.ok(!body.includes("stack"));
    }
    const publicAsset = await fetch(`${harness.origin}/api/v1/assets/${PUBLIC_ASSET_ID}`);
    assert.equal(publicAsset.status, 200);
    assert.match(publicAsset.headers.get("cache-control") ?? "", /^public,/);
    assert.ok((await publicAsset.text()).includes("SYNTHETIC_ATTACHMENT_CONTENT_91C2"));
  } finally {
    await harness.close();
  }
});

test("non-owner cannot establish a session; owner cookie and positive controls work", async () => {
  const harness = await createHarness();
  try {
    const rejected = await login(harness, { nonOwner: true });
    assert.equal(rejected.callback.status, 403);
    assert.equal(rejected.token, null);
    assert.ok(!rejected.callback.headers.getSetCookie().some((value) => value.startsWith("__Host-daytrace_session=")));

    const { token, callback } = await login(harness);
    assert.equal(callback.status, 302);
    assert.ok(token);
    const setCookie = callback.headers.getSetCookie().find((value) => value.startsWith("__Host-daytrace_session="));
    assert.ok(setCookie);
    assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Secure/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Max-Age=5/);
    assert.ok(!setCookie.includes("Domain="));

    for (const path of [
      "/api/v1/records?scope=owner",
      `/api/v1/records/${PRIVATE_ID}?scope=owner`,
      `/api/v1/assets/${PRIVATE_ASSET_ID}`,
    ]) {
      const response = await fetch(`${harness.origin}${path}`, { headers: sessionHeader(token) });
      assert.equal(response.status, 200);
      assertNoStore(response);
      const body = await response.text();
      assert.ok(body.includes("PRIVATE_"));
      assert.ok(!body.includes(token));
    }
  } finally {
    await harness.close();
  }
});

test("session rotation and tampered or duplicate cookies fail closed", async () => {
  const harness = await createHarness();
  try {
    const first = await ownerLogin(harness);
    const second = await ownerLogin(harness, first);
    assert.notEqual(first, second);
    const old = await fetch(`${harness.origin}/api/v1/records?scope=owner`, { headers: sessionHeader(first) });
    assert.equal(old.status, 401);
    for (const cookie of [
      `__Host-daytrace_session=${second.slice(0, -1)}x`,
      `__Host-daytrace_session=${second}; __Host-daytrace_session=${second}`,
    ]) {
      const response = await fetch(`${harness.origin}/api/v1/records?scope=owner`, { headers: { cookie } });
      assert.equal(response.status, 401);
      assertNoStore(response);
    }
  } finally {
    await harness.close();
  }
});

test("idle and absolute server expiry revoke private access", async () => {
  const harness = await createHarness();
  try {
    const idle = await ownerLogin(harness);
    harness.clock.now += 1_001;
    const expired = await fetch(`${harness.origin}/api/v1/assets/${PRIVATE_ASSET_ID}`, { headers: sessionHeader(idle) });
    assert.equal(expired.status, 404);
    assertNoStore(expired);

    const absolute = await ownerLogin(harness);
    for (let elapsed = 0; elapsed < 4_500; elapsed += 900) {
      harness.clock.now += 900;
      const active = await fetch(`${harness.origin}/api/v1/records?scope=owner`, { headers: sessionHeader(absolute) });
      assert.equal(active.status, 200);
    }
    harness.clock.now += 501;
    const overAbsolute = await fetch(`${harness.origin}/api/v1/records?scope=owner`, { headers: sessionHeader(absolute) });
    assert.equal(overAbsolute.status, 401);
  } finally {
    await harness.close();
  }
});

test("Origin plus CSRF protects logout, rotates tokens, and revokes the server session", async () => {
  const harness = await createHarness();
  try {
    const session = await ownerLogin(harness);
    const firstToken = await csrf(harness, session);
    const rotatedToken = await csrf(harness, session);
    assert.notEqual(firstToken, rotatedToken);
    for (const headers of [
      { ...sessionHeader(session), "x-csrf-token": rotatedToken },
      { ...sessionHeader(session), origin: "https://attacker.invalid", "x-csrf-token": rotatedToken },
      { ...sessionHeader(session), origin: harness.origin },
      { ...sessionHeader(session), origin: harness.origin, "x-csrf-token": firstToken },
      { ...sessionHeader(session), origin: "null", "x-csrf-token": rotatedToken },
    ]) {
      const response = await fetch(`${harness.origin}/api/v1/auth/logout`, { method: "POST", headers });
      assert.equal(response.status, 403);
      assertNoStore(response);
      const body = await response.json() as { error: { code: string } };
      assert.equal(body.error.code, "CSRF_REJECTED");
    }
    const stillValid = await fetch(`${harness.origin}/api/v1/records?scope=owner`, { headers: sessionHeader(session) });
    assert.equal(stillValid.status, 200);

    const logout = await fetch(`${harness.origin}/api/v1/auth/logout`, {
      method: "POST",
      headers: { ...sessionHeader(session), origin: harness.origin, "x-csrf-token": rotatedToken },
    });
    assert.equal(logout.status, 204);
    assertNoStore(logout);
    const cleared = logout.headers.getSetCookie().find((value) => value.startsWith("__Host-daytrace_session="));
    assert.ok(cleared);
    assert.match(cleared, /Max-Age=0/);
    assert.match(cleared, /Secure/);
    const replay = await fetch(`${harness.origin}/api/v1/records/${PRIVATE_ID}?scope=owner`, { headers: sessionHeader(session) });
    assert.equal(replay.status, 404);
  } finally {
    await harness.close();
  }
});

test("revoke-all and whitelist removal invalidate every current session", async () => {
  const harness = await createHarness();
  try {
    const first = await ownerLogin(harness);
    const second = await ownerLogin(harness);
    const token = await csrf(harness, first);
    const revoked = await fetch(`${harness.origin}/api/v1/auth/revoke-all`, {
      method: "POST",
      headers: { ...sessionHeader(first), origin: harness.origin, "x-csrf-token": token },
    });
    assert.equal(revoked.status, 204);
    for (const session of [first, second]) {
      const response = await fetch(`${harness.origin}/api/v1/records?scope=owner`, { headers: sessionHeader(session) });
      assert.equal(response.status, 401);
    }

    const removed = await ownerLogin(harness);
    harness.owners.replace([]);
    const denied = await fetch(`${harness.origin}/api/v1/records?scope=owner`, { headers: sessionHeader(removed) });
    assert.equal(denied.status, 401);
    assertNoStore(denied);
  } finally {
    await harness.close();
  }
});

test("asset IDs, metadata traversal, encoded paths, and symlinks cannot escape", async () => {
  const harness = await createHarness();
  try {
    const session = await ownerLogin(harness);
    for (const path of [
      `/api/v1/assets/${ESCAPE_ASSET_ID}`,
      `/api/v1/assets/${SYMLINK_ASSET_ID}`,
      "/api/v1/assets/..%2Foutside.txt",
      "/api/v1/assets/%2e%2e%5coutside.txt",
      "/api/v1/assets/%2Fetc%2Fpasswd",
      "/api/v1/assets/not-an-asset-id",
    ]) {
      const response = await fetch(`${harness.origin}${path}`, { headers: sessionHeader(session) });
      assert.ok(response.status === 400 || response.status === 404);
      const body = await response.text();
      assert.ok(!body.includes(OUTSIDE_CANARY));
      assert.ok(!body.includes("root:x:"));
    }
  } finally {
    await harness.close();
  }
});

test("private errors are generic, non-cacheable, and free of canaries or paths", async () => {
  const harness = await createHarness();
  try {
    const session = await ownerLogin(harness);
    for (const path of ["/api/v1/owner-error", "/api/v1/records/rec_7d0c0f2d-8f5b-4f0e-a3a6-000000000000?scope=owner"]) {
      const response = await fetch(`${harness.origin}${path}`, { headers: sessionHeader(session) });
      assert.ok(response.status === 404 || response.status === 500);
      assertNoStore(response);
      const body = await response.text();
      assert.ok(!body.includes(PRIVATE_CANARY));
      assert.ok(!body.includes("/private/synthetic"));
      assert.ok(!body.includes("stack"));
    }
  } finally {
    await harness.close();
  }
});

test("persistent SQLite sessions survive restart and store only token hashes", async () => {
  const firstHarness = await createHarness();
  let secondHarness: Awaited<ReturnType<typeof createHarness>> | undefined;
  try {
    const session = await ownerLogin(firstHarness);
    const csrfToken = await csrf(firstHarness, session);
    const database = new DatabaseSync(firstHarness.databasePath, { readOnly: true });
    const rows = database.prepare("SELECT * FROM sessions").all();
    database.close();
    assert.equal(rows.length, 1);
    const serialized = JSON.stringify(rows);
    assert.ok(!serialized.includes(session));
    assert.ok(!serialized.includes(csrfToken));

    await firstHarness.app.close();
    secondHarness = await createHarness({
      temporaryRoot: firstHarness.temporaryRoot,
      databasePath: firstHarness.databasePath,
      clock: firstHarness.clock,
    });
    const response = await fetch(`${secondHarness.origin}/api/v1/records?scope=owner`, { headers: sessionHeader(session) });
    assert.equal(response.status, 200);
    assertNoStore(response);
  } finally {
    if (secondHarness !== undefined) await secondHarness.close();
    else await firstHarness.close();
  }
});

test("login transactions are one-time and return targets stay local", async () => {
  const harness = await createHarness();
  try {
    assert.equal(safeReturnTo(undefined), "/owner");
    assert.equal(safeReturnTo("/owner?from=login"), "/owner?from=login");
    for (const target of ["https://attacker.invalid", "//attacker.invalid", "/\\attacker.invalid", "/owner\n"]) {
      assert.throws(() => safeReturnTo(target));
    }
    const start = await fetch(`${harness.origin}/api/v1/auth/login`, { redirect: "manual" });
    const loginCookie = start.headers.getSetCookie().find((value) => value.startsWith("__Host-daytrace_login="));
    assert.ok(loginCookie);
    const transaction = loginCookie.split(";", 1)[0];
    const location = start.headers.get("location");
    assert.ok(location);
    const first = await fetch(location, { redirect: "manual", headers: { cookie: transaction } });
    assert.equal(first.status, 302);
    const replay = await fetch(location, { redirect: "manual", headers: { cookie: transaction } });
    assert.equal(replay.status, 401);
    assertNoStore(replay);
  } finally {
    await harness.close();
  }
});
