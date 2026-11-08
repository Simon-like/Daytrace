import assert from "node:assert/strict";
import { test } from "node:test";
import { managementRequest, ManagementRequestError, onManagementSessionExpired } from "../../../packages/content/src/management/api";

test("401 notifies once and rejects a private response already in flight", async context => {
  let resolveFirst!: (response: Response) => void;
  const delayed = new Promise<Response>(resolve => { resolveFirst = resolve; });
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => ++calls === 1 ? delayed : new Response(null, { status: 401 }));
  let expired = 0;
  const unsubscribe = onManagementSessionExpired(() => { expired += 1; });
  try {
    const previous = managementRequest<{ secret: string }>("content");
    await assert.rejects(managementRequest("content"), (error: unknown) => error instanceof ManagementRequestError && error.status === 401);
    resolveFirst(Response.json({ secret: "PRIVATE_TEST_CANARY" }));
    await assert.rejects(previous, (error: unknown) => error instanceof ManagementRequestError && error.status === 401);
    assert.equal(expired, 1);
  } finally { unsubscribe(); }
});

test("CSRF session expiry stops the write before it starts", async context => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => { calls += 1; return new Response(null, { status: 401 }); });
  await assert.rejects(managementRequest("content/record", {}), (error: unknown) => error instanceof ManagementRequestError && error.status === 401);
  assert.equal(calls, 1);
});

test("missing preview remains distinct from a transient failure", async context => {
  let expired = 0;
  const unsubscribe = onManagementSessionExpired(() => { expired += 1; });
  context.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "不存在" } }, { status: 404 }));
  try {
    await assert.rejects(managementRequest("imports/example"), (error: unknown) => error instanceof ManagementRequestError && error.status === 404);
    assert.equal(expired, 0);
  } finally { unsubscribe(); }
});

test("a late network failure after expiration is reported as expired", async context => {
  let rejectFirst!: (error: Error) => void;
  const delayed = new Promise<Response>((_, reject) => { rejectFirst = reject; });
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => ++calls === 1 ? delayed : new Response(null, { status: 401 }));
  const previous = managementRequest("content");
  await assert.rejects(managementRequest("content"), (error: unknown) => error instanceof ManagementRequestError && error.status === 401);
  rejectFirst(new Error("connection failed"));
  await assert.rejects(previous, (error: unknown) => error instanceof ManagementRequestError && error.status === 401);
});
