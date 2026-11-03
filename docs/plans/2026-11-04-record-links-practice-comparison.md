# Record Links and Practice Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. 本仓库禁止子 Agent，实际由当前 Kimi owner 在 dev 内联执行。

**Goal:** 交付 F3 的人工记录关联与跨次菜谱实践对照，关联目标严格继承调用方阅读权限。

**Architecture:** Markdown v1 增加可选 `relatedRecords` 稳定 ID 数组，快照负责全库引用校验，Nest 详情投影按 public／owner 范围生成正向和反向关联。桌面与 H5 只渲染已授权摘要；菜谱将当前记录与关联菜谱按实际日期排序，不新增知识图谱或自动推荐。

**Tech Stack:** Node.js 24.18.0、TypeScript、NestJS 12.3.2、Next.js 16.4.3、React 19.3.1、node:test、Playwright。

## Global Constraints

- 只在 `dev` 串行开发，每个独立切片验证后 commit 并 push；不合并 `main`、不部署。
- 关联最多 16 项，只接受现有 `rec_<uuid>`；重复、自关联、未知 ID 均使整份候选快照失败。
- 公开响应只能含 `published + public` 目标；主人响应可含主人可见目标。浏览器不得补取后自行过滤私密记录。
- 关联源字节继续参与 contentRevision；私密目标变化不得改变 publicContentRevision。
- 真实 iPhone/Safari、生产部署与性能预算不作为本地 Chromium 已通过项。

---

### Task 1: 关联契约与权限安全详情投影

**Files:**
- Modify: `apps/api/src/modules/content/content.types.ts`
- Modify: `apps/api/src/modules/content/frontmatter.ts`
- Modify: `apps/api/src/modules/content/content.snapshot.ts`
- Modify: `apps/api/src/modules/content/content.service.ts`
- Modify: `apps/api/src/modules/content/content.controller.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/fixtures.ts`
- Modify: `docs/architecture/contracts/frontmatter-v1.schema.json`
- Modify: `docs/architecture/contracts/markdown-v1.md`
- Test: `apps/api/src/modules/content/frontmatter.test.ts`
- Test: `apps/api/src/modules/content/content.snapshot.test.ts`
- Test: `tests/integration/api.integration.test.ts`
- Test: `tests/integration/access/access.integration.test.ts`

**Interfaces:**
- Consumes: 现有 `SourceRecord`、`ContentService.getPublicRecord()`、`getOwnerRecord()`。
- Produces: `SourceFrontmatter.relatedRecords: readonly string[]`、`RecordDetail.relatedRecords: readonly RecordSummary[]`、`ContentService.projectDetail(record, scope: "public" | "owner"): RecordDetail`。

- [x] **Step 1: 写 frontmatter、快照和 HTTP 失败测试**

```ts
assert.deepEqual(parseFrontmatter(sourceWithRelated, file).metadata?.relatedRecords, [targetId]);
await assert.rejects(loadContentSnapshot(rootWithUnknownTarget), /CONTENT_SNAPSHOT_INVALID/);
const publicDetail = service.projectDetail(publicRecord, "public");
assert.deepEqual(publicDetail.relatedRecords.map(item => item.id), [publicTargetId]);
const ownerDetail = service.projectDetail(publicRecord, "owner");
assert.deepEqual(ownerDetail.relatedRecords.map(item => item.id), [privateTargetId, publicTargetId]);
```

HTTP 负例断言公开详情序列化不含私密目标的 ID、标题和摘要；主人详情包含相同私密目标，证明不是全局删除关联。

- [x] **Step 2: 运行并确认字段与投影尚不存在**

Run: `pnpm exec tsx --tsconfig apps/api/tsconfig.json --test apps/api/src/modules/content/frontmatter.test.ts apps/api/src/modules/content/content.snapshot.test.ts`
Expected: FAIL，`relatedRecords` 是未知字段且详情没有关联投影。

- [x] **Step 3: 实现最小契约与快照校验**

```ts
const relatedRecords = data.relatedRecords ?? [];
if (!Array.isArray(relatedRecords) || relatedRecords.length > 16 ||
    !relatedRecords.every(id => typeof id === "string" && RECORD_ID_PATTERN.test(id)) ||
    new Set(relatedRecords).size !== relatedRecords.length || relatedRecords.includes(data.id)) {
  issues.push(issue(file, "CONTENT_FIELD_INVALID", "relatedRecords 必须是最多 16 个不重复且不含自身的记录 ID", "relatedRecords"));
}
```

快照建立 ID 集合后逐项检查目标存在性；`RecordDetail` 初始 `relatedRecords: []`，列表摘要必须剔除该详情字段。

- [x] **Step 4: 实现权限投影并运行测试**

```ts
projectDetail(record: SourceRecord, scope: "public" | "owner"): RecordDetail {
  const pool = scope === "owner" ? this.current().records : this.current().publicRecords;
  const relatedRecords = pool.filter(candidate => candidate.metadata.id !== record.metadata.id &&
    (record.metadata.relatedRecords.includes(candidate.metadata.id) ||
     candidate.metadata.relatedRecords.includes(record.metadata.id)))
    .map(toPublicSummary).sort((a, b) => a.id.localeCompare(b.id));
  return { ...record.detail, relatedRecords };
}
```

控制器返回 `projectDetail(record, scope === "owner" ? "owner" : "public")`；公开解析器逐项调用 `parsePublicRecordSummary`，主人适配器使用主人摘要解析。

Run: `pnpm test:unit && pnpm test:integration`
Expected: 全部通过，公开响应无私密目标，主人响应可见同一目标。

- [x] **Step 5: Commit**

```bash
git add apps/api/src/modules/content packages/contracts/src tests/integration docs/architecture/contracts
git commit -m "feat(content): project authorized record relationships"
```

### Task 2: 桌面与 H5 关联及菜谱实践对照

**Files:**
- Create: `apps/site/src/features/reader/record-links.tsx`
- Modify: `apps/site/src/features/reader/reader-article.tsx`
- Modify: `apps/site/src/features/reader/reader.module.css`
- Modify: `apps/site/src/app/owner/records/[recordId]/page.tsx`
- Modify: `apps/site/src/server/owner-api.ts`
- Create: `apps/h5/src/components/record-links.tsx`
- Modify: `apps/h5/src/components/mobile-reader.tsx`
- Modify: `apps/h5/src/app/globals.css`
- Modify: `apps/h5/src/server/owner-api.ts`
- Modify: `apps/api/fixtures/demo/public/mapo-tofu/index.md`
- Create: `apps/api/fixtures/demo/private/mapo-tofu-second/index.md`
- Test: `tests/e2e/acceptance/demo.browser.mjs`
- Test: `tests/e2e/h5/mobile.browser.mjs`

**Interfaces:**
- Consumes: `RecordDetail.relatedRecords`。
- Produces: `RecordLinks({ record, owner })`；主人链接前缀 `/owner/records/`，H5 由 Next basePath 加 `/h5`。

- [x] **Step 1: 写双端失败路径**

桌面与 H5 测试打开公开麻婆豆腐，断言公开页没有第二份私密实践的标题和 ID；登录主人后打开相同记录，看到“第二次麻婆豆腐实践”，按日期顺序显示两次实践并进入私密正文。

- [x] **Step 2: 运行并确认关联 UI 不存在**

Run: `pnpm test:browser && pnpm test:h5`
Expected: FAIL，找不到“跨次实践”和第二次实践标题。

- [x] **Step 3: 实现关联与日期对照**

```tsx
const practices = [record, ...record.relatedRecords.filter(item => item.type === "recipe")]
  .sort((a, b) => (a.occurredOn ?? "9999-12-31").localeCompare(b.occurredOn ?? "9999-12-31") || a.id.localeCompare(b.id));
```

关联区只渲染响应中的摘要；菜谱有两条及以上可见实践时展示日期、标题、摘要和链接，无日期显示“未记日期”，不得推断日期。

- [x] **Step 4: 运行双端和布局回归**

Run: `pnpm test:browser && pnpm test:h5 && pnpm typecheck && pnpm lint`
Expected: 公开无私密关联，主人对照可用；390／430px 无整页溢出，键盘与减少动态效果不回归。

- [x] **Step 5: Commit**

```bash
git add apps/site/src apps/h5/src apps/api/fixtures/demo tests/e2e
git commit -m "feat(reader): compare linked recipe practices on both apps"
```

### Task 3: 内容维护兼容、证据与交接

**Files:**
- Modify: `apps/api/src/modules/content-management/normalize.ts`
- Test: `apps/api/src/modules/content-management/content-management.test.ts`
- Create: `docs/project/reports/LINK-001.md`
- Create: `docs/collaboration/handoffs/LINK-001-kimi-relations.md`
- Create: `docs/collaboration/reviews/LINK-001-self-review.md`
- Modify: `docs/context/当前工作上下文.md`
- Modify: `docs/project/项目进度.md`

**Interfaces:**
- Consumes: Task 1 的 `SourceFrontmatter.relatedRecords`。
- Produces: 导入、更新、恢复与导出均保留相同关联 ID；不改变默认私密草稿行为。

- [x] **Step 1: 写更新与导出失败测试**

```ts
assert.deepEqual(updated.metadata.relatedRecords, previous.metadata.relatedRecords);
assert.ok(exportedMarkdown.includes(`relatedRecords:`));
assert.equal(updated.metadata.visibility, "private");
```

- [x] **Step 2: 保留更新时未显式提交的关联**

```ts
relatedRecords: data.relatedRecords ?? previous?.metadata.relatedRecords ?? [],
status: "draft",
visibility: "private",
```

- [x] **Step 3: 全量验证**

Run: `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm test:content && pnpm test:browser && pnpm test:h5 && pnpm build && python3 scripts/project_check.py`
Expected: 全部通过；读取 dev 最新托管 CI，运行未完成或失败不得写 success。

- [x] **Step 4: 写证据并完成中央交接**

报告区分公开／主人关联、合成／真实数据、Chromium／真机和本地／生产；submit／complete LINK-001 后提交文档并推送 dev。
