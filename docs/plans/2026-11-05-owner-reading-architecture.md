# Owner Reading Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将桌面与 H5 重复的主人 SSR 读取和运行时校验收敛为一个共享深模块与两个 Next 薄适配器，并用准确导航降低后续 AI 的定位成本。

**Architecture:** `@daytrace/contracts` 拥有公开与主人响应的纯运行时解析，内部共享结构校验但保持权限语义分离；`@daytrace/content/owner-api` 拥有固定会话转发、传输、错误映射和 owner 响应读取。桌面与 H5 只通过 `next/headers` 取得会话并组合客户端，Nest 始终是授权权威。

**Tech Stack:** TypeScript、Next.js 16.4.3、NestJS 12.3.2、pnpm workspace、Fetch API、node:test。

## Global Constraints

- 只在 `dev` 串行实施，不新建任务分支、不合并 `main`、不部署；功能、文档分别验证并独立提交。
- 保留本地提交 `2fc74c3`、`04e41fc` 和所有既有未提交现场，不混入无关改动。
- 不合并公开与主人权限投影，不开放任意 scope、路径、Cookie 或请求头，不把授权决策移出 Nest。
- 不同步重构搜索、资产、内容发布、阅读增强或双端 UI，不新增通用 utils、DI 框架或第二套业务 API。
- Node.js 24.18.0、pnpm 11.23.0；本机命令使用 `npx --yes pnpm@11.23.0 ...`。
- 保留真实 Nest SSR、私密附件和双端浏览器安全回归；Chromium 与合成身份不等于正式 QA。

---

## File Structure

| 文件 | 单一责任 |
| --- | --- |
| `packages/contracts/src/index.ts` | 纯响应契约、共享内部结构解析、公开／主人独立入口 |
| `packages/contracts/src/index.test.ts` | 主人私密／草稿／关联记录解析和公开负例 |
| `packages/content/src/owner-api.ts` | 框架无关的主人 HTTP 客户端、固定 Cookie、错误与 CSRF |
| `packages/content/package.json` | 显式导出 `./owner-api`，不进入浏览器根入口 |
| `apps/site/src/server/owner-api.ts` | 桌面 Next Cookie 组合根 |
| `apps/h5/src/server/owner-api.ts` | H5 Next Cookie 组合根 |
| `tests/integration/access/ssr-forwarding.integration.test.ts` | 共享客户端传输端口与真实 Nest 权限集成 |
| `docs/architecture/模块导航.md` | 按业务需求定位模块、入口和测试 |
| `docs/architecture/技术选型与研发路径.md` | 当前仓库与依赖方向基线 |
| `docs/architecture/contracts/api-v1.md` | 当前 Nest 契约实现状态 |
| `docs/project/reports/ARCH-002.md` | 实际改动、验证与未做范围 |
| `docs/project/evidence/ARCH-002/` | 可复现验证结果 |

### Task 1: 收敛 owner 响应契约

**Files:**
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/index.test.ts`

**Interfaces:**
- Consumes: 现有 `syntheticRecordDetailResponse()`、`syntheticRecordListResponse()`、`parsePublicRecordSummary()`、`parseOwnerRecordSummary()`。
- Produces: `parseOwnerRecordListResponse(value: unknown): RecordListResponse`、`parseOwnerRecordDetailResponse(value: unknown): RecordDetailResponse`。

- [x] **Step 1: 写 owner 私密、草稿和私密关联记录的失败测试**

在 `packages/contracts/src/index.test.ts` 导入两个新解析器，并添加：

```ts
test("owner response parsers accept private drafts and private related records", () => {
  const list = syntheticRecordListResponse();
  const privateSummary = {
    ...list.data.items[0],
    status: "draft" as const,
    visibility: "private" as const,
  };
  const ownerList = {
    ...list,
    data: { ...list.data, items: [privateSummary] },
  };
  assert.deepEqual(parseOwnerRecordListResponse(ownerList), ownerList);

  const detail = syntheticRecordDetailResponse();
  const ownerDetail = {
    ...detail,
    data: {
      ...detail.data,
      status: "draft" as const,
      visibility: "private" as const,
      relatedRecords: [privateSummary],
    },
  };
  assert.deepEqual(parseOwnerRecordDetailResponse(ownerDetail), ownerDetail);
  assert.throws(() => parseRecordDetailResponse(ownerDetail));
});
```

- [x] **Step 2: 确认新解析器尚不存在**

Run:

```bash
npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test packages/contracts/src/index.test.ts
```

Expected: FAIL，提示两个 owner response export 不存在。

- [x] **Step 3: 提取私有共享解析并添加 owner 入口**

在 `packages/contracts/src/index.ts` 使用解析器函数参数复用结构规则：

```ts
type RecordSummaryParser = (value: unknown) => RecordSummary;

function parseRecordDetail(value: unknown, parseSummary: RecordSummaryParser): RecordDetail {
  const summary = parseSummary(value);
  const record = object(value, "RECORD");
  const body = object(record.body, "RECORD_BODY");
  if (body.parseRevision !== MARKDOWN_PARSE_REVISION || !Array.isArray(body.toc) || !Array.isArray(record.attachments) || !Array.isArray(record.relatedRecords)) {
    throw new Error("RECORD_BODY_INVALID");
  }
  const toc = body.toc.map((item): TocItem => {
    const entry = object(item, "TOC_ITEM");
    const level = positiveInteger(entry.level, "TOC_LEVEL");
    if (level < 2 || level > 6) throw new Error("TOC_LEVEL_INVALID");
    return { id: string(entry.id, "TOC_ID"), text: string(entry.text, "TOC_TEXT", true), level };
  });
  return {
    ...summary,
    body: { html: string(body.html, "RECORD_HTML", true), toc, parseRevision: MARKDOWN_PARSE_REVISION },
    attachments: record.attachments.map(parseAttachment),
    relatedRecords: record.relatedRecords.map(parseSummary),
  };
}

function parseListResponse(value: unknown, parseSummary: RecordSummaryParser): RecordListResponse {
  const envelope = success(value);
  const data = object(envelope.data, "LIST_DATA");
  const pageInfo = object(data.pageInfo, "PAGE_INFO");
  if (!Array.isArray(data.items) || typeof pageInfo.hasMore !== "boolean") throw new Error("LIST_DATA_INVALID");
  if (pageInfo.nextCursor !== null && typeof pageInfo.nextCursor !== "string") throw new Error("NEXT_CURSOR_INVALID");
  return {
    schemaVersion: API_SCHEMA_VERSION,
    data: {
      items: data.items.map(parseSummary),
      pageInfo: { hasMore: pageInfo.hasMore, nextCursor: pageInfo.nextCursor as string | null },
    },
    meta: parseMeta(envelope.meta),
  };
}
```

公开入口继续传 `parsePublicRecordSummary`；新增：

```ts
export function parseOwnerRecordListResponse(value: unknown): RecordListResponse {
  return parseListResponse(value, parseOwnerRecordSummary);
}

export function parseOwnerRecordDetailResponse(value: unknown): RecordDetailResponse {
  const envelope = success(value);
  return {
    schemaVersion: API_SCHEMA_VERSION,
    data: parseRecordDetail(envelope.data, parseOwnerRecordSummary),
    meta: parseMeta(envelope.meta),
  };
}
```

- [x] **Step 4: 运行契约测试并提交**

Run:

```bash
npx --yes pnpm@11.23.0 exec tsx --tsconfig apps/api/tsconfig.json --test packages/contracts/src/index.test.ts
```

Expected: 现有公开负例和新 owner 测试全部 PASS。

Commit:

```bash
git add packages/contracts/src/index.ts packages/contracts/src/index.test.ts
git commit -m "refactor(contracts): unify owner response parsing"
```

### Task 2: 建立共享主人客户端和双端薄组合根

**Files:**
- Create: `packages/content/src/owner-api.ts`
- Modify: `packages/content/package.json`
- Modify: `apps/site/src/server/owner-api.ts`
- Modify: `apps/h5/src/server/owner-api.ts`
- Test: `tests/integration/access/ssr-forwarding.integration.test.ts`

**Interfaces:**
- Consumes: Task 1 的两个 owner response parser，以及现有 `PublicApiError`、`parseSiteRuntimeConfig()`。
- Produces: `createOwnerApiClient(sessionValue: string | null, options?: OwnerApiClientOptions): OwnerApiClient`；双端 `ownerApi(): Promise<OwnerApiClient>` 保持不变。

- [x] **Step 1: 把 SSR 测试迁到共享边界并添加 fetch 端口测试**

将工厂导入改为 `@daytrace/content/owner-api`，真实 Nest 测试注入 `apiInternalOrigin: harness.origin`，不再修改 `process.env`。新增：

```ts
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
});
```

同时导入 `syntheticRecordListResponse` 的相对 fixtures 路径。

- [x] **Step 2: 确认共享模块缺失**

Run:

```bash
npx --yes pnpm@11.23.0 build:packages && npx --yes pnpm@11.23.0 exec tsx --tsconfig tests/integration/access/tsconfig.json --test tests/integration/access/ssr-forwarding.integration.test.ts
```

Expected: FAIL，无法解析 `@daytrace/content/owner-api`。

- [x] **Step 3: 实现固定策略的共享 HTTP 客户端**

创建 `packages/content/src/owner-api.ts`，公开类型固定为：

```ts
export interface OwnerApiClientOptions {
  readonly apiInternalOrigin?: string;
  readonly fetch?: typeof fetch;
}

export interface OwnerApiClient {
  list(cursor?: string): Promise<RecordListData>;
  record(recordId: string): Promise<RecordDetail | null>;
  csrf(): Promise<string>;
}
```

`createOwnerApiClient()` 内部的 `request(path)` 必须按此顺序实现：先校验 43 字符合成 session 并抛 `401 AUTH_REQUIRED`；再读取 `options.apiInternalOrigin ?? parseSiteRuntimeConfig(process.env).apiInternalOrigin`，配置失败抛 500；最后以 `options.fetch ?? globalThis.fetch` 发请求。请求只允许：

```ts
{
  cache: "no-store",
  redirect: "manual",
  headers: {
    accept: "application/json",
    cookie: `__Host-daytrace_session=${sessionValue}`,
  },
  signal: AbortSignal.timeout(2_000),
}
```

列表固定请求 `/api/v1/records?scope=owner` 并用 `parseOwnerRecordListResponse()`；详情固定 `scope=owner`，非法 ID 和 `404 RECORD_NOT_FOUND` 返回 null，用 `parseOwnerRecordDetailResponse()`；CSRF 固定 `/api/v1/auth/csrf` 并校验 43 字符 token。网络失败映射 503，成功响应契约失败映射 502，错误响应沿用 `parseApiErrorResponse()` 和同一个 `PublicApiError` 类。

在 `packages/content/package.json` 添加：

```json
"./owner-api": "./src/owner-api.ts"
```

- [x] **Step 4: 收缩双端 Next 适配器**

双端 `apps/site/src/server/owner-api.ts` 与 `apps/h5/src/server/owner-api.ts` 只保留：

```ts
import { cookies } from "next/headers";
import { createOwnerApiClient, type OwnerApiClient } from "@daytrace/content/owner-api";

const SESSION_COOKIE = "__Host-daytrace_session";

export async function ownerApi(): Promise<OwnerApiClient> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return createOwnerApiClient(session);
}
```

页面不改调用方式，不重新导出工厂，不在共享模块导入 `next/headers`。

- [x] **Step 5: 运行 SSR 和类型回归并提交**

Run:

```bash
npx --yes pnpm@11.23.0 build:packages && npx --yes pnpm@11.23.0 exec tsx --tsconfig tests/integration/access/tsconfig.json --test tests/integration/access/ssr-forwarding.integration.test.ts
npx --yes pnpm@11.23.0 typecheck
```

Expected: 固定 Cookie、过期会话、私密正文、CSRF、显式 fetch 端口和双端类型检查全部 PASS。

Commit:

```bash
git add packages/content/src/owner-api.ts packages/content/package.json apps/site/src/server/owner-api.ts apps/h5/src/server/owner-api.ts tests/integration/access/ssr-forwarding.integration.test.ts
git commit -m "refactor(owner): share server reading adapter"
```

### Task 3: 建立 AI 模块导航并修正架构基线

**Files:**
- Create: `docs/architecture/模块导航.md`
- Modify: `docs/architecture/技术选型与研发路径.md`
- Modify: `docs/architecture/contracts/api-v1.md`
- Modify: `docs/plans/2026-11-05-owner-reading-architecture.md`

**Interfaces:**
- Consumes: 当前 workspace 实际目录和 Task 1–2 的模块入口。
- Produces: 一个按需求定位代码与测试的导航入口，不复制任务状态。

- [x] **Step 1: 写模块导航**

`模块导航.md` 固定包含四部分：

1. “先改哪里”表格：公开读取→`packages/content/src/public-api.ts`；主人 SSR→`packages/content/src/owner-api.ts` 与双端薄组合根；浏览器搜索→`packages/content/src/search-api.ts`；线协议→`packages/contracts/src/index.ts`；内容发布→`apps/api/src/modules/content-management/`；桌面阅读→`apps/site/src/features/reader/`；H5 阅读→`apps/h5/src/components/mobile-reader.tsx`。
2. 依赖方向：`apps/* → packages/*`，`content → contracts/config`，包不得反向依赖 apps，Nest 拥有授权。
3. 修改规则：先找业务模块再改路由；公开与主人解析不能混用；双端只有真实框架差异留在适配器；不新增一行 re-export 或泛化 utils。
4. 验证定位：契约测试、SSR 集成、内容管理测试、桌面和 H5 浏览器脚本各自对应路径与命令。

- [x] **Step 2: 修正过期架构描述**

在 `技术选型与研发路径.md` 的仓库图加入 `apps/h5`、`packages/ui`、`packages/content` 和 API `content-management`；将“暂不拆 UI 包”改为当前真实依赖方向。将“这描述目标结构，不代表服务已经存在”改为“Nest 正式工程已存在，真实外部部署与 QA 状态看项目进度”。

将 `api-v1.md` 顶部状态改为契约已在正式 Nest 服务落地，本文固定当前接口形状；历史 CONTENT-001 仅作为来源，不再写“当前没有正式 Nest 服务”。

- [x] **Step 3: 校验文档链接与计划一致性**

Run:

```bash
python3 scripts/project_check.py
```

Expected: 无缺失链接、目录或任务结构错误；导航不包含第二套进度、owner 或完成状态。

Commit:

```bash
git add docs/architecture/模块导航.md docs/architecture/技术选型与研发路径.md docs/architecture/contracts/api-v1.md docs/plans/2026-11-05-owner-reading-architecture.md
git commit -m "docs(architecture): add module navigation for maintainers"
```

### Task 4: 全量回归与架构交接

**Files:**
- Create: `docs/project/reports/ARCH-002.md`
- Create: `docs/project/evidence/ARCH-002/validation.json`
- Create: `docs/collaboration/handoffs/ARCH-002-kimi-owner-reader.md`
- Create: `docs/collaboration/reviews/ARCH-002-self-review.md`
- Modify: `docs/context/当前工作上下文.md`
- Modify: `docs/project/项目进度.md`
- Modify: `docs/collaboration/board.json`

**Interfaces:**
- Consumes: Task 1–3 的提交、测试和导航。
- Produces: 可复现验证、剩余架构候选和推送／CI 真实状态。

- [x] **Step 1: 执行全量门禁**

Run:

```bash
npx --yes pnpm@11.23.0 lint
npx --yes pnpm@11.23.0 typecheck
npx --yes pnpm@11.23.0 test:unit
npx --yes pnpm@11.23.0 test:integration
npx --yes pnpm@11.23.0 test:content
npx --yes pnpm@11.23.0 build
DEMO_MANAGED_SERVER=1 DEMO_PORT=3380 DEMO_API_PORT=3381 DEMO_EVIDENCE_DIR=docs/project/evidence/ARCH-002 npx --yes pnpm@11.23.0 test:browser
H5_TEST_SITE_PORT=3390 H5_TEST_API_PORT=3391 H5_TEST_H5_PORT=3392 H5_TEST_EVIDENCE_DIR=docs/project/evidence/ARCH-002/h5 npx --yes pnpm@11.23.0 test:h5
python3 scripts/project_check.py
```

Expected: 全部 exit code 0，双端 consoleErrors/errors 为空；失败时先修复，不减少权限或覆盖断言。

- [x] **Step 2: 记录真实结果和未做范围**

报告必须包含：双端各 216 行到薄组合根的实际行数、owner 契约入口、显式 fetch／origin 端口、权限测试、全量数量、Node 版本、性能预算、未推送／CI 状态。明确内容发布、搜索工作流和阅读增强仍是独立候选，本轮未改。

- [x] **Step 3: 提交交接并完成任务**

Run:

```bash
python3 scripts/task_claim.py submit ARCH-002 kimi-ARCH-002-owner-reader --evidence docs/project/reports/ARCH-002.md
python3 scripts/task_claim.py complete ARCH-002 kimi-ARCH-002-owner-reader --evidence docs/collaboration/reviews/ARCH-002-self-review.md
python3 scripts/project_check.py
```

Expected: ARCH-002 为 done，QA-001、RELEASE-001、UI-002 状态不变；文档提交独立留痕。只有实际推送成功才写“已推送”，只有对应完整 SHA 的 Actions 成功才写当前 CI 通过。
