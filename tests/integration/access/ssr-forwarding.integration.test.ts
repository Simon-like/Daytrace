import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request } from "express";
import { createOwnerApiClient } from "../../../apps/site/src/server/owner-api";
import { PublicApiError } from "../../../apps/site/src/server/api";
import {
  assertNoStore,
  createHarness,
  ownerLogin,
  PRIVATE_CANARY,
  PRIVATE_ID,
  SyntheticOwnerContentController,
} from "./support";

test("Next server adapter forwards only the fixed session cookie to owner APIs", async () => {
  const harness = await createHarness();
  const previousOrigin = process.env.API_INTERNAL_ORIGIN;
  try {
    const session = await ownerLogin(harness);
    process.env.API_INTERNAL_ORIGIN = harness.origin;
    let observed: Request | undefined;
    SyntheticOwnerContentController.observer = (request) => {
      observed = request;
    };
    const client = createOwnerApiClient(session);
    const list = await client.list();
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0]?.visibility, "private");
    assert.ok(observed);
    assert.equal(observed.headers.cookie, `__Host-daytrace_session=${session}`);
    assert.equal(observed.headers.authorization, undefined);
    assert.equal(observed.headers["x-forwarded-host"], undefined);
    assert.equal(observed.headers["x-owner"], undefined);
    assert.equal(observed.headers["x-user-email"], undefined);

    const detail = await client.record(PRIVATE_ID);
    assert.ok(detail);
    assert.ok(detail.body.html.includes(PRIVATE_CANARY));
    assert.ok(!detail.body.html.includes(session));
    const token = await client.csrf();
    assert.notEqual(token, session);

    const response = await fetch(`${harness.origin}/api/v1/records/${PRIVATE_ID}?scope=owner`, {
      headers: { cookie: `__Host-daytrace_session=${session}` },
    });
    assertNoStore(response);
    await response.body?.cancel();
  } finally {
    SyntheticOwnerContentController.observer = undefined;
    if (previousOrigin === undefined) delete process.env.API_INTERNAL_ORIGIN;
    else process.env.API_INTERNAL_ORIGIN = previousOrigin;
    await harness.close();
  }
});

test("SSR adapter denies missing and expired sessions without exposing private bytes", async () => {
  const harness = await createHarness();
  const previousOrigin = process.env.API_INTERNAL_ORIGIN;
  try {
    process.env.API_INTERNAL_ORIGIN = harness.origin;
    await assert.rejects(
      () => createOwnerApiClient(null).list(),
      (error: unknown) => error instanceof PublicApiError && error.status === 401 && error.code === "AUTH_REQUIRED",
    );
    const session = await ownerLogin(harness);
    harness.clock.now += 1_001;
    assert.equal(await createOwnerApiClient(session).record(PRIVATE_ID), null);
    await assert.rejects(
      () => createOwnerApiClient(session).list(),
      (error: unknown) => error instanceof PublicApiError && error.status === 401 && error.code === "AUTH_REQUIRED",
    );
    const visitor = await fetch(`${harness.origin}/api/v1/records/${PRIVATE_ID}?scope=owner`);
    assert.equal(visitor.status, 404);
    const body = await visitor.text();
    assert.ok(!body.includes(PRIVATE_CANARY));
    assertNoStore(visitor);
  } finally {
    if (previousOrigin === undefined) delete process.env.API_INTERNAL_ORIGIN;
    else process.env.API_INTERNAL_ORIGIN = previousOrigin;
    await harness.close();
  }
});
