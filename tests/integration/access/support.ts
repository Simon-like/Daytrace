import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DynamicModule, Module, UseGuards } from "@nestjs/common";
import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { API_SCHEMA_VERSION, type RecordDetail } from "@daytrace/contracts";
import { ApiErrorFilter } from "../../../apps/api/src/common/api-error.filter";
import { RecordNotFoundError } from "../../../apps/api/src/common/api-error";
import { RequestIdMiddleware } from "../../../apps/api/src/common/request-id.middleware";
import {
  AuthModule,
  OwnerGuard,
  OwnerObjectGuard,
  OwnerPolicy,
  SessionService,
  SyntheticOidcProvider,
  SYNTHETIC_ISSUER,
} from "../../../apps/api/src/modules/auth";
import { AssetsModule, type AssetDescriptor } from "../../../apps/api/src/modules/assets";

export const PRIVATE_ID = "rec_7d0c0f2d-8f5b-4f0e-a3a6-555555555555";
export const PRIVATE_ASSET_ID = "ast_7d0c0f2d-8f5b-4f0e-a3a6-555555555555";
export const PUBLIC_ASSET_ID = "ast_7d0c0f2d-8f5b-4f0e-a3a6-666666666666";
export const ESCAPE_ASSET_ID = "ast_7d0c0f2d-8f5b-4f0e-a3a6-888888888888";
export const SYMLINK_ASSET_ID = "ast_7d0c0f2d-8f5b-4f0e-a3a6-999999999999";
export const PRIVATE_CANARY = "PRIVATE_BODY_CANARY_5B11";
export const OUTSIDE_CANARY = "OUTSIDE_SYNTHETIC_CANARY_ACCESS_001";
const contentRevision = `sha256:${"a".repeat(64)}`;

export const privateDetail: RecordDetail = {
  id: PRIVATE_ID,
  type: "reflection",
  title: "PRIVATE_TITLE_CANARY_5B11",
  slug: "private-owner-canary",
  oldSlugs: [],
  occurredOn: null,
  updatedAt: "2026-10-30T10:00:00+08:00",
  revision: 1,
  tags: ["synthetic"],
  summary: "PRIVATE_SUMMARY_CANARY_5B11",
  status: "published",
  visibility: "private",
  relatedRecords: [],
  body: {
    html: `<p>${PRIVATE_CANARY}</p>`,
    toc: [],
    parseRevision: "daytrace-markdown-3",
  },
  attachments: [{
    id: PRIVATE_ASSET_ID,
    mediaType: "text/plain",
    url: `/api/v1/assets/${PRIVATE_ASSET_ID}`,
  }],
};

@Controller()
export class SyntheticOwnerContentController {
  static observer: ((request: Request) => void) | undefined;

  @Get("records")
  @UseGuards(OwnerGuard)
  list(@Req() request: Request, @Query("scope") scope?: string) {
    SyntheticOwnerContentController.observer?.(request);
    assert.equal(scope, "owner");
    return {
      schemaVersion: API_SCHEMA_VERSION,
      data: {
        items: [{ ...privateDetail, body: undefined, attachments: undefined }],
        pageInfo: { hasMore: false, nextCursor: null },
      },
      meta: { requestId: "synthetic-owner-list", contentRevision },
    };
  }

  @Get("records/:recordId")
  @UseGuards(OwnerObjectGuard)
  detail(@Param("recordId") recordId: string, @Query("scope") scope?: string) {
    assert.equal(scope, "owner");
    if (recordId !== PRIVATE_ID) throw new RecordNotFoundError();
    return {
      schemaVersion: API_SCHEMA_VERSION,
      data: privateDetail,
      meta: { requestId: "synthetic-owner-detail", contentRevision },
    };
  }

  @Get("owner-error")
  @UseGuards(OwnerGuard)
  failure(): never {
    throw new Error(`${PRIVATE_CANARY} /private/synthetic/source.md`);
  }
}

@Module({})
class SyntheticAccessRootModule {}

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

function cookieValue(setCookies: readonly string[], name: string): string | null {
  const prefix = `${name}=`;
  const entry = setCookies.find((value) => value.startsWith(prefix));
  if (entry === undefined) return null;
  return entry.slice(prefix.length).split(";", 1)[0] ?? null;
}

export interface Harness {
  readonly app: INestApplication;
  readonly origin: string;
  readonly databasePath: string;
  readonly owners: OwnerPolicy;
  readonly sessions: SessionService;
  readonly clock: { now: number };
  readonly temporaryRoot: string;
  close(): Promise<void>;
}

export async function createHarness(options: {
  temporaryRoot?: string;
  databasePath?: string;
  clock?: { now: number };
} = {}): Promise<Harness> {
  const fresh = options.temporaryRoot === undefined;
  const temporaryRoot = options.temporaryRoot ?? await mkdtemp(join(tmpdir(), "daytrace-access-"));
  const databasePath = options.databasePath ?? join(temporaryRoot, "sessions.sqlite");
  const fixtureRoot = resolve(process.cwd(), "apps/api/fixtures/content");
  const privateRoot = join(fixtureRoot, "private/owner-canary");
  const publicRoot = join(fixtureRoot, "public/engineering-ssr");
  const symlinkRoot = join(temporaryRoot, "symlink-root");
  const outsideFile = join(temporaryRoot, "outside.txt");
  if (fresh) {
    await mkdir(join(symlinkRoot, "files"), { recursive: true });
    await writeFile(outsideFile, OUTSIDE_CANARY);
    await symlink(outsideFile, join(symlinkRoot, "files/escape.txt"));
  }
  const descriptors: readonly AssetDescriptor[] = [
    { id: PRIVATE_ASSET_ID, visibility: "private", rootPath: privateRoot, relativePath: "files/private.txt", mediaType: "text/plain" },
    { id: PUBLIC_ASSET_ID, visibility: "public", rootPath: publicRoot, relativePath: "files/checklist.txt", mediaType: "text/plain" },
    { id: ESCAPE_ASSET_ID, visibility: "private", rootPath: privateRoot, relativePath: "../../../../outside.txt", mediaType: "text/plain" },
    { id: SYMLINK_ASSET_ID, visibility: "private", rootPath: symlinkRoot, relativePath: "files/escape.txt", mediaType: "text/plain" },
  ];
  const catalog = { findPublishedAsset: (id: string) => descriptors.find((item) => item.id === id) ?? null };
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const clock = options.clock ?? { now: Date.now() };
  const auth = AuthModule.register({
    environment: "test",
    publicOrigin: origin,
    databasePath,
    ownerIdentities: [{ issuer: SYNTHETIC_ISSUER, subject: "owner" }],
    provider: new SyntheticOidcProvider(),
    now: () => clock.now,
    idleTtlMs: 1_000,
    absoluteTtlMs: 5_000,
    loginTtlMs: 1_000,
  });
  const moduleDefinition: DynamicModule = {
    module: SyntheticAccessRootModule,
    imports: [auth, AssetsModule.register(catalog)],
    controllers: [SyntheticOwnerContentController],
  };
  const app = await NestFactory.create(moduleDefinition, new ExpressAdapter(), { logger: false, abortOnError: false });
  const requestId = new RequestIdMiddleware();
  app.use((request: Request, response: Response, next: NextFunction) => requestId.use(request, response, next));
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiErrorFilter());
  app.enableShutdownHooks();
  await app.init();
  await app.listen(port, "127.0.0.1");
  const owners = app.get(OwnerPolicy);
  const sessions = app.get(SessionService);
  return {
    app,
    origin,
    databasePath,
    owners,
    sessions,
    clock,
    temporaryRoot,
    close: async () => {
      SyntheticOwnerContentController.observer = undefined;
      await app.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    },
  };
}

export async function login(
  harness: Harness,
  options: { nonOwner?: boolean; previousSession?: string; returnTo?: string } = {},
): Promise<{ token: string | null; callback: Response }> {
  const returnTo = options.returnTo ?? "/owner";
  const start = await fetch(`${harness.origin}/api/v1/auth/login?returnTo=${encodeURIComponent(returnTo)}`, { redirect: "manual" });
  assert.equal(start.status, 302);
  const loginToken = cookieValue(start.headers.getSetCookie(), "__Host-daytrace_login");
  assert.ok(loginToken);
  const location = start.headers.get("location");
  assert.ok(location);
  const callbackUrl = new URL(location);
  if (options.nonOwner === true) callbackUrl.searchParams.set("code", "synthetic-non-owner-code");
  const cookies = [`__Host-daytrace_login=${loginToken}`];
  if (options.previousSession !== undefined) cookies.push(`__Host-daytrace_session=${options.previousSession}`);
  const callback = await fetch(callbackUrl, {
    redirect: "manual",
    headers: { cookie: cookies.join("; ") },
  });
  const token = cookieValue(callback.headers.getSetCookie(), "__Host-daytrace_session");
  return { token, callback };
}

export async function ownerLogin(harness: Harness, previousSession?: string): Promise<string> {
  const { token, callback } = await login(harness, previousSession === undefined ? {} : { previousSession });
  assert.equal(callback.status, 302);
  assert.ok(token);
  return token;
}

export async function csrf(harness: Harness, session: string): Promise<string> {
  const response = await fetch(`${harness.origin}/api/v1/auth/csrf`, {
    headers: { cookie: `__Host-daytrace_session=${session}` },
  });
  assert.equal(response.status, 200);
  const payload = await response.json() as { csrfToken: string };
  return payload.csrfToken;
}

export function sessionHeader(session: string): { cookie: string } {
  return { cookie: `__Host-daytrace_session=${session}` };
}

export function assertNoStore(response: Response): void {
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
}
