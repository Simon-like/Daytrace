# Owner Identity and Private Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 本仓库实际执行不使用子 Agent，由当前 Kimi owner 在 `dev` 串行完成。

**Goal:** 接通真实 Auth0 OIDC、持久主人会话和桌面／H5 主人私密检索，同时保持公开索引完全不包含私密数据。

**Architecture:** 保留 NestJS 的 `OwnerGuard` 与 SQLite 会话边界，用 `openid-client` 完成发现、授权码、PKCE、state、nonce 和 ID Token 校验。主人搜索只有在会话授权成功后才构建／读取独立 owner 索引；桌面与 H5 复用现有搜索状态机和 API 契约，结果链接进入各自的主人阅读路由。

**Tech Stack:** Node.js 24.18.0、TypeScript、NestJS 12.3.2、Next.js 16.4.3、`node:sqlite`、`openid-client` 6.8.8、Node test、Playwright。

## Global Constraints

- 只在 `dev` 开发；每个功能边界验证后独立 commit 并推送，不合并 `main`、不部署。
- 不覆盖已有的 `apps/site/next-env.d.ts`、`experiments/ARCH-001/evidence/*` 和未跟踪设计资产现场。
- 合成身份只在显式测试／本机 Demo 使用；生产必须 HTTPS、Auth0 和持久 SQLite 文件。
- 私密正文、标题、摘要、标签和搜索片段不能进入公开索引、公开响应、日志或错误详情。
- 主人搜索响应必须 `no-store`；401 时界面清空旧私密结果并提供重新登录，不显示为空结果。
- 真实 Auth0 账户与真实设备未验证时必须明确保留为外部验收项。

---

### Task 1: 主人独立搜索索引与 API

**Files:**
- Create: `apps/api/src/modules/search/owner-search.index.ts`
- Modify: `apps/api/src/modules/search/search.service.ts`
- Modify: `apps/api/src/modules/search/owner-search.ts`
- Modify: `apps/api/src/modules/search/search.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `tests/e2e/find/owner-search.e2e.test.ts`

**Interfaces:**
- Consumes: `ContentService.listOwner()`、`ContentService.getOwnerRecord()`、`ContentService.ownerContentRevision`、`SessionService.resolve()`。
- Produces: `GET /api/v1/search?scope=owner&q=...&status=...&visibility=...`；未登录 401，登录后返回 `SearchPage`，使用完整内容修订而不是公开修订。

- [ ] **Step 1: 写失败的 HTTP 正负例**

用临时 `public/private` Markdown 建立真实 `AppModule`，使用 `SyntheticOidcProvider` 登录。固定测试：访客 401；公开 scope 即使带主人 Cookie 也无私密 canary；主人可检索私密标题、标签和正文；`status=draft`、`visibility=private` 过滤正确；公开与主人响应修订可不同；所有主人响应含 `no-store`。

- [ ] **Step 2: 运行并确认当前实现失败**

Run: `pnpm exec tsx --tsconfig apps/api/tsconfig.json --test tests/e2e/find/owner-search.e2e.test.ts`
Expected: 主人登录后仍为 503 `SEARCH_UNAVAILABLE`，因为 `MissingOwnerSearchService` 尚未替换。

- [ ] **Step 3: 实现独立索引和 owner 查询**

`OwnerSearchIndex.read()` 只在授权后由控制器路径调用，以 `ownerContentRevision` 缓存，使用 `listOwner()` 和 `getOwnerRecord()` 建立独立记录集。`SearchService` 增加：

```ts
searchOwner(query: OwnerSearchQuery): SearchPage {
  return this.search(query, "owner");
}
```

私有统一查询只在 owner 分支应用 `status`／`visibility`，分页 fingerprint 包含 scope 和两个过滤字段，防止公开游标与主人游标混用。

- [ ] **Step 4: 接入 Nest providers**

`SearchModule.register(contentModule, owner = false)` 在 owner 模式下注册 `SessionOwnerSearchAuthorization`、`OwnerSearchIndex` 和 `OwnerSearchService`；无身份配置时保留 401 占位实现。`AppModule` 在 demo 或真实 auth 存在时开启 owner 搜索。

- [ ] **Step 5: 运行搜索与既有权限回归**

Run: `pnpm exec tsx --tsconfig apps/api/tsconfig.json --test tests/e2e/find/*.test.ts && pnpm test:integration`
Expected: 新主人搜索及既有公开搜索、会话、附件、SSR 与 Demo 全部通过。

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/modules/search tests/e2e/find
git commit -m "feat(search): add authorized owner index and private retrieval"
```

### Task 2: Auth0 OIDC 协议客户端与持久登录事务

**Files:**
- Create: `apps/api/src/modules/auth/openid-auth0.client.ts`
- Create: `apps/api/src/modules/auth/openid-auth0.client.test.ts`
- Modify: `apps/api/src/modules/auth/auth.types.ts`
- Modify: `apps/api/src/modules/auth/session.service.ts`
- Modify: `apps/api/src/modules/auth/sqlite-session.store.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.env.example`
- Test: `tests/integration/access/access.integration.test.ts`

**Interfaces:**
- Consumes: `Auth0ProtocolClient`、`AuthRuntimeOptions`、已存在登录事务 Cookie。
- Produces: `OpenidAuth0Client implements Auth0ProtocolClient`；`LoginTransaction.nonce` 为当次原始 nonce，只用于授权码回调校验，不进入日志。

- [ ] **Step 1: 固定依赖并写协议客户端失败测试**

安装 `openid-client@6.8.8`。通过注入 operations 验证授权 URL 必须含 `scope=openid`、state、nonce、S256 challenge；回调必须传 `expectedState`、`expectedNonce`、`pkceCodeVerifier`；缺 `sub`／`iss`／`auth_time` 必须拒绝，合法 claims 映射 `VerifiedIdentity`。

- [ ] **Step 2: 运行并确认客户端不存在**

Run: `pnpm exec tsx --tsconfig apps/api/tsconfig.json --test apps/api/src/modules/auth/openid-auth0.client.test.ts`
Expected: FAIL，无法加载 `openid-auth0.client`。

- [ ] **Step 3: 实现正式客户端**

使用 Context7 已核对的 6.8.8 API：`discovery()`、`buildAuthorizationUrl()`、`authorizationCodeGrant()` 和 `tokens.claims()`。授权码交换后只读取 claims，不保存 access token，不记录 code、nonce、token 或身份信息。

- [ ] **Step 4: 迁移短期登录事务 nonce**

将 `nonceHash` 改为 `nonce`，使库能执行精确 nonce 校验。SQLite 初始化检测旧 `nonce_hash` 列时，在单个启动迁移中重命名并删除未消费旧事务；既有长期会话表不变。新增持久化重启测试，证明新会话可恢复、旧登录事务不能重放。

- [ ] **Step 5: 接入运行时配置和文档模板**

`main.ts` 在非 Demo 且存在 `AUTH_PROVIDER` 时调用 `authOptionsFromEnvironment(process.env, new OpenidAuth0Client())`。`.env.example` 只加入无真实值的 Auth0 issuer/client、主人白名单和绝对 SQLite 路径示例。

- [ ] **Step 6: 运行协议、类型与持久会话测试**

Run: `pnpm exec tsx --tsconfig apps/api/tsconfig.json --test apps/api/src/modules/auth/openid-auth0.client.test.ts && pnpm test:integration && pnpm typecheck`
Expected: 全部通过；测试不访问真实 Auth0。

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/main.ts apps/api/src/modules/auth apps/api/package.json pnpm-lock.yaml .env.example tests/integration/access
git commit -m "feat(auth): connect Auth0 OIDC with persistent verified sessions"
```

### Task 3: 桌面主人检索与会话失效体验

**Files:**
- Modify: `packages/content/src/search-api.ts`
- Modify: `apps/site/src/features/search/search-panel.tsx`
- Modify: `apps/site/src/features/search/search-results.tsx`
- Modify: `apps/site/src/app/owner/page.tsx`
- Test: `tests/unit/find/search.test.ts`
- Test: `tests/e2e/acceptance/demo.browser.mjs`

**Interfaces:**
- Consumes: Task 1 的 owner Search API 和 Task 2 的会话。
- Produces: `fetchSearch(query, scope, signal)`；`SearchPanel({ scope = "public" })`；owner 结果链接 `/owner/records/<id>/`。

- [ ] **Step 1: 写 scope 与失效状态测试**

固定 `fetchSearch(..., "owner")` 生成 `scope=owner`；公开调用不改变。401 产生 `AUTH_REQUIRED`，reducer 清空 result；测试不将 401 渲染成“没有找到”。

- [ ] **Step 2: 实现向后兼容搜索 API 和结果链接**

保留 `fetchPublicSearch()` 包装器；新增 `fetchSearch()`。`SearchResults` 根据 scope 选择公开／主人链接和列表标签，其他高亮与键盘行为不变。

- [ ] **Step 3: 在主人页接入搜索和重新登录**

仅 `ownerApi().list()` 成功后渲染 `SearchPanel scope="owner"`。`AUTH_REQUIRED` 错误区显示 `/api/v1/auth/login?returnTo=/owner` 链接，其他错误仍显示重试与 requestId。

- [ ] **Step 4: 浏览器跑通私密检索、退出和过期**

在合成 Demo 中检索私密 canary，确认公开搜索无结果；主人搜索有结果并可打开；退出后私密结果消失且 API 401；恢复会话过期 fixture 后显示重新登录。

- [ ] **Step 5: 回归与 Commit**

Run: `pnpm test:unit && pnpm test:browser`

```bash
git add packages/content/src/search-api.ts apps/site/src/features/search apps/site/src/app/owner/page.tsx tests/unit/find tests/e2e/acceptance
git commit -m "feat(owner): add private search and session recovery"
```

### Task 4: H5 主人空间与移动私密检索

**Files:**
- Create: `apps/h5/src/server/owner-api.ts`
- Create: `apps/h5/src/features/owner/owner-search.tsx`
- Create: `apps/h5/src/app/owner/page.tsx`
- Create: `apps/h5/src/app/owner/records/[recordId]/page.tsx`
- Modify: `apps/h5/src/components/mobile-nav.tsx`
- Test: `tests/e2e/h5/mobile.browser.mjs`

**Interfaces:**
- Consumes: 与桌面相同的 Nest owner API、Cookie 和搜索契约。
- Produces: H5 `/owner`、`/owner/records/<recordId>/`，支持 390px 主人登录、检索、阅读、退出和 401 恢复。

- [ ] **Step 1: 写 H5 失败路径**

Playwright 在独立 H5 origin 登录合成主人，断言私密检索与正文可用，公开 H5 搜索无私密 canary，退出后 401 不保留旧结果。

- [ ] **Step 2: 实现 H5 owner 服务端适配和页面**

复用 `@daytrace/content` 搜索状态机与契约；H5 服务端只做 Cookie 转发和响应校验，权限仍由 Nest 执行。移动结果链接和返回位置使用 H5 路由，不跳桌面应用。

- [ ] **Step 3: 验证移动触摸、安全区与减少动态效果**

Run: `pnpm test:h5 && pnpm typecheck && pnpm lint`
Expected: 390／430px 无整页横向溢出，44px 关键触摸区、safe-area 和 reduced-motion 不回归。

- [ ] **Step 4: Commit**

```bash
git add apps/h5 tests/e2e/h5
git commit -m "feat(h5): add owner space and private mobile search"
```

### Task 5: F1 证据、文档与开发分支 CI 门禁

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `docs/project/reports/OWNER-001.md`
- Create: `docs/collaboration/handoffs/OWNER-001-kimi-owner.md`
- Create: `docs/collaboration/reviews/OWNER-001-self-review.md`
- Modify: `docs/context/当前工作上下文.md`
- Modify: `docs/project/项目进度.md`

**Interfaces:**
- Consumes: Tasks 1–4 的实际测试与提交证据。
- Produces: `dev` push 触发同一 required CI；F1 本地／协议测试结论与真实 Auth0、真机、生产未验证项清楚分离。

- [ ] **Step 1: 为 dev 增加 CI 触发并更新工作流测试**

`push.branches` 改为 `[main, dev]`，release-build 仍只接受受信 main，不扩大发布权限。工作流测试固定 dev CI 与 main-only release 两条规则。

- [ ] **Step 2: 全量验证**

Run: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:content && pnpm build && python3 scripts/project_check.py`
Expected: 全部通过；任何失败先修复，不标 F1 完成。

- [ ] **Step 3: 写证据、提交并推送**

报告明确：真实 Auth0 未使用用户账户实测、真实 iPhone/Safari 未验收、生产未部署。完成 board 交接与自检后推送 `dev`，再读取 GitHub Actions 实际运行结论；源码 YAML 不冒充托管 CI 成功。
