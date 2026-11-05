import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request } from "express";
import { createOwnerApiClient } from "@daytrace/content/owner-api";
import { PublicApiError } from "@daytrace/content/public-api";
import { syntheticRecordListResponse } from "../../../packages/contracts/src/fixtures";
import {
  assertNoStore,
  createHarness,
  ownerLogin,
  PRIVATE_CANARY,
  PRIVATE_ID,
  SyntheticOwnerContentController,
} from "./support";

test("shared owner adapter accepts explicit fetch and origin ports", async () => {
  const session = "s".repeat(43);
  let observedUrl: URL | undefined;
  let observedInit: RequestInit | undefined;
  const client = createOwnerApiClient(session, {
    apiInternalOrigin: "http://owner.internal",
    fetch: async (input, init) => {
      observedUrl = new URL(input instanceof Request ? input.url : input);
      observedInit = init;
      return Response.json(syntheticRecordListResponse());
    },
  });
  await client.list();
  assert.equal(observedUrl?.origin, "http://owner.internal");
  assert.equal(observedUrl?.searchParams.get("scope"), "owner");
  assert.equal(new Headers(observedInit?.headers).get("cookie"), `__Host-daytrace_session=${session}`);
  assert.equal(new Headers(observedInit?.headers).get("authorization"), null);
  assert.equal(observedInit?.cache, "no-store");
  assert.equal(observedInit?.redirect, "manual");
});

test("shared owner adapter forwards only the fixed session cookie to owner APIs", async () => {
  const harness = await createHarness();
  try {
    const session = await ownerLogin(harness);
    let observed: Request | undefined;
    SyntheticOwnerContentController.observer = (request) => {
      observed = request;
    };
    const client = createOwnerApiClient(session, { apiInternalOrigin: harness.origin });
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
    await harness.close();
  }
});

test("SSR adapter denies missing and expired sessions without exposing private bytes", async () => {
  const harness = await createHarness();
  try {
    const options = { apiInternalOrigin: harness.origin };
    await assert.rejects(
      () => createOwnerApiClient(null, options).list(),
      (error: unknown) => error instanceof PublicApiError && error.status === 401 && error.code === "AUTH_REQUIRED",
    );
    const session = await ownerLogin(harness);
    harness.clock.now += 1_001;
    assert.equal(await createOwnerApiClient(session, options).record(PRIVATE_ID), null);
    await assert.rejects(
      () => createOwnerApiClient(session, options).list(),
      (error: unknown) => error instanceof PublicApiError && error.status === 401 && error.code === "AUTH_REQUIRED",
    );
    const visitor = await fetch(`${harness.origin}/api/v1/records/${PRIVATE_ID}?scope=owner`);
    assert.equal(visitor.status, 404);
    const body = await visitor.text();
    assert.ok(!body.includes(PRIVATE_CANARY));
    assertNoStore(visitor);
  } finally {
    await harness.close();
  }
});
