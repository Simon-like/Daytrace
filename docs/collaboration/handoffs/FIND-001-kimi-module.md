# FIND-001 集成交接：记录发现与公开搜索

- 分支：`agent/FIND-001/kimi`
- 基线：`0381904161d095dd8ca14c24a72a37ffa0cee9fa`
- 交付 SHA：本文件所属提交；集成前用 `git rev-parse HEAD` 读取最终值。
- 状态：模块与测试已交付，未合并、未推送、未部署；自检不代替独立评审。
- 数据：所有测试记录与私密 canary 都是合成 fixture，不是用户真实经历或真实私密内容。

## 1. Nest 接口与接入

公开检索：

```text
GET /api/v1/search?q=<1–100字>&scope=public&type=<可选>&tag=<可重复AND>&limit=<1–50>&cursor=<可选>
```

成功响应沿用 `schemaVersion: "1.0"`、`meta.requestId` 和 `meta.contentRevision`；`data.items[]` 为 `{ record, matches }`。`matches[].text` 是纯文本，`ranges` 是 Unicode 码点区间。标题命中优先于标签，标签优先于正文，其后保持公开记录默认排序。无命中是 HTTP 200 空集合；索引失败是 503 `SEARCH_UNAVAILABLE`；快照错误继续使用 `CONTENT_SNAPSHOT_INVALID` / `CONTENT_SNAPSHOT_UNAVAILABLE`。

`PublicSearchIndex` 只调用 `ContentService.listPublic()` 和 `getPublicRecord()` 建立公开派生索引，不访问 `ContentSnapshot.records` 或 private 投影。公开请求不读取身份，也不因 Cookie 改变集合。公开搜索成功响应可重验证；错误由现有全局过滤器设置 `no-store`。

集成者需在 `app.module.ts` 用下面这一项替换现有 `ContentModule.register(contentRoot)`，不要同时重复注册两个内容实例：

```ts
imports: [SearchModule.register(ContentModule.register(contentRoot))]
```

`SearchModule` 会导入并再导出所接收的 `ContentModule`，同时注册 `SearchController`。本任务按边界没有修改 `app.module.ts`，所以未集成前正式应用不会自动暴露 `/api/v1/search`。

## 2. owner 扩展点（未接入真实授权）

`owner-search.ts` 导出：

- `OWNER_SEARCH_AUTHORIZATION` / `OwnerSearchAuthorization`：由 ACCESS 使用 Nest 的真实会话和主人白名单策略实现。
- `OWNER_SEARCH_SERVICE` / `OwnerSearchService`：授权后查询独立 owner 投影／索引。

默认授权实现始终返回 401 `AUTH_REQUIRED`；默认 owner 查询不返回任何 fixture 私密数据。`scope=owner` 使用 `no-store`。ACCESS 集成时必须同时提供真实授权和独立 owner 索引，并补非主人、过期、撤销、公开转私密、双会话与缓存负例；不能用 Cookie 存在、邮箱或测试角色冒充主人授权。真实 owner 检索及其安全性未验证。

## 3. 前端组件接口

```tsx
import { RecordList, RecordsDiscovery } from "../features/records";
import { SearchPanel } from "../features/search";
```

- `RecordList({ records, emptyMessage?, onRecordClick? })`：保留原首页 `records` 用法；服务端渲染且不传回调时不会创建事件处理器。样式已迁移到 CSS Modules。
- `RecordsDiscovery({ initialRecords, initialContentRevision?, initialFilters?, availableTags? })`：客户端类别／多标签 AND 筛选、清除、加载、空结果、错误与重试。浏览器通过同域 `/api/v1/records` 获取公开集合。若首页需要全量标签候选，集成者应传入 `availableTags`，不能只依赖首页第一页。
- `SearchPanel({ initialQuery?, onClose? })`：输入、提交、清除、Escape／可选关闭、加载、结果、无结果、失败与重试。浏览器通过同域 `/api/v1/search` 检索；集成者需保证该同域路径到达 Nest。没有 owner 搜索 UI。

筛选状态写入 URL 的 `type` 和重复 `tag`；搜索词写入 `q`。记录筛选把经过公开契约校验的当前页与滚动位置存入对应 `history.state.daytraceDiscovery`，搜索在 `daytraceSearch` 保存查询和位置；`popstate` 与持久化 `pageshow` 恢复，慢请求通过 AbortController 和请求序号隔离。没有 localStorage、私密搜索历史或客户端私密集合。搜索高亮使用 React 文本节点和 `<mark>`，没有 `dangerouslySetInnerHTML`。

## 4. 实际验证

在指定 worktree 内使用锁文件既有依赖，未新增依赖或修改 lockfile。

```bash
node_modules/.bin/tsx --tsconfig apps/api/tsconfig.json --test tests/unit/find/*.test.ts tests/e2e/find/*.test.ts
# 14 passed：固定关键词、标题/标签/正文排序、AND 筛选、Unicode 高亮、签名游标、
# Cookie 访客公开边界、私密 canary、owner 401、空结果/错误、URL/历史状态、慢响应隔离。

node_modules/.bin/oxlint apps/site/src/features/records apps/site/src/features/search apps/api/src/modules/search tests/unit/find tests/e2e/find
# 0 warnings, 0 errors

npx --yes pnpm@11.23.0 run lint
npx --yes pnpm@11.23.0 run typecheck
npx --yes pnpm@11.23.0 run build
npx --yes pnpm@11.23.0 run test:unit
npx --yes pnpm@11.23.0 run test:integration
npx --yes pnpm@11.23.0 run test:e2e
# 均通过：原有 15 项 unit、4 项 API integration、1 项真实 Nest/Next SSR E2E。
```

FIND 的真实 HTTP 测试使用临时内容根，并由前端 `parsePublicSearchResponse` 直接解析 Nest 响应。`SEARCH_UNAVAILABLE` 的失败语义有服务单测；坏快照的 503、稳定错误码和 requestId 有真实 HTTP 测试。成功响应的 contentRevision 有跨端断言。

## 5. 未验证与集成注意

- 未做真实浏览器点击、键盘／触摸、响应式截图、Safari、iPhone、BFCache 或实际前进后退 E2E；URL／历史恢复目前由纯状态测试和代码路径覆盖，不能冒充 AC-03 完整验收。
- 未做独立安全评审、生产反代／CDN、公共缓存、公开转私密后的索引清理演练、1000 条性能测试或生产部署。
- 未接真实 Auth0／主人白名单／会话，owner 搜索不是可用功能。
- 搜索响应类型位于 `features/search/search-contract.ts`，因为本任务不能修改共享 contracts。若集成者希望前后端共用搜索运行时 schema，应另行串行提升契约并保留兼容测试。
- 根测试脚本尚未纳入 `tests/unit/find` 和 `tests/e2e/find`，需集成者按统一测试编排添加，不在本任务越界修改根 package。
