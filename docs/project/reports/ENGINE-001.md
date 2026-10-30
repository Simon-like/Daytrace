# ENGINE-001 技术选型验证与实施报告

- 日期：2026-10-30
- 任务：ENGINE-001
- 分支：`agent/ENGINE-001/kimi`
- 基线：`b993b1b71f6626a2a4eb82d94d0dae826cb47ee2`
- 状态：本地实施与自检完成；已提交至 `agent/ENGINE-001/kimi`，未合并、未部署，未经过独立评审。

## 1. 交付结论

已在独立 worktree 建立正式 pnpm monorepo，并完成以下运行时纵向切片：

```text
合成 Markdown 与附件
  → Nest 全量读取、校验并构建候选快照
  → 仅 published + public 的公开投影
  → 公开列表 / 详情 / 附件 API
  → 共享运行时响应契约
  → Next 请求时服务端渲染
  → 首页、详情、目录与附件 URL 的 HTML
```

Next 不读取 Markdown、不挂载内容目录，也不自行判断公开或私密权限。所有内容均来自 `apps/api/fixtures/content/` 的合成样本；真实 `content/` 未被读取或修改。身份登录与主人访问明确留给 ACCESS，本任务没有临时登录或前端伪权限。

## 2. 固定版本与工程结构

实际运行环境为 Node.js `24.22.1`、pnpm `11.23.0`。

| 范围 | 固定版本 |
| --- | --- |
| Next.js | `16.4.3` |
| NestJS common / core / platform-express | `12.3.2` |
| React / React DOM | `19.3.1` |
| TypeScript | `7.0.2` |
| Marked | `18.1.2` |
| tsx | `4.23.15` |
| oxlint | `1.90.0` |

工作区包含：

- `apps/api`：Nest 内容模块、公开 API、合成 fixture、内容校验 CLI。
- `apps/site`：Next App Router、运行时 SSR 页面、品牌站点壳与公开 API 适配层。
- `packages/contracts`：纯类型、公开 ID 规则和列表 / 详情 / 错误响应的运行时 parser。
- `packages/config`：API 与站点环境变量解析及边界校验。
- `scripts/dev`：同时启动两个服务、转发 Next 地址参数并清理子进程。
- `tests/integration`：真实 Nest HTTP 集成测试和构建后 Nest + Next 端到端测试。

根目录提供统一 `dev`、`lint`、`typecheck`、`test:unit`、`test:integration`、`build`、`test:e2e`、`content:validate` 与 `docs:validate` 命令。依赖版本与解析结果写入 `pnpm-lock.yaml`，`.npmrc` 固定使用 npm 官方 registry。

## 3. 内容与公开边界

### 3.1 候选快照

- 每次加载先完整解析和校验候选内容，再替换当前快照；任何一条内容错误都会使整批候选失败，不产生半新半旧状态。
- 首次加载失败时，公开读取返回带定位详情的 `503 CONTENT_SNAPSHOT_INVALID`，不能退化为空列表。
- 已有有效快照后的重新初始化失败不会丢弃上一份有效快照。
- `contentRevision` 由源内容字节计算；当前 fixture 为 `sha256:12f61f5a270ac3522562637534d4c0237587ccce19a93d5f5f1a93b68d21fc65`。

### 3.2 公开投影

只有同时满足 `status: published` 与 `visibility: public` 的记录进入公开列表、详情和附件索引。私密与草稿记录在公开详情中均表现为 `404 RECORD_NOT_FOUND`，不通过不同响应泄露存在性；私密附件返回 `404 ASSET_NOT_FOUND`。

API 提供：

- `GET /api/v1/records`：公开列表、类型 / 标签过滤、limit 与签名校验的游标分页。
- `GET /api/v1/records/:recordId`：公开详情、正文 HTML、TOC、修订与 ETag。
- `GET /api/v1/assets/:assetId`：按稳定附件 ID 返回受控字节，不暴露源文件路径。
- `GET /api/v1/health/live` 与 `GET /api/v1/health/ready`。

错误响应具有稳定错误码、`requestId` 和可选字段定位；异常响应不返回堆栈或服务器绝对路径。`scope=owner` 只返回 `401 AUTH_REQUIRED`，没有伪造主人接口。

### 3.3 Markdown

Nest 使用 gray-matter 读取 frontmatter，使用 Marked 单次 token 流生成正文与 TOC，并在输出前清洗 HTML。标题获得稳定 `section-N` ID；声明附件的相对引用改写为 `/api/v1/assets/:assetId`。原始 HTML、正文 H1、危险链接、未声明附件、未知 frontmatter 字段及非法日期都会使候选快照失败。

## 4. Next SSR 与错误行为

- 首页和记录详情显式使用 `dynamic = "force-dynamic"`；API 适配层使用 `fetch(..., { cache: "no-store" })`。
- 构建输出中 `/` 与 `/records/[recordRef]` 均为 `ƒ (Dynamic) server-rendered on demand`，不是构建时内容静态化。
- 详情页直接使用 Nest 已清洗和授权的公开 HTML；共享 parser 拒绝契约不兼容或含私密字段的响应。
- 旧 slug `release-check-v0` 通过 `permanentRedirect` 返回 `308`，指向公开 canonical ID。
- API 中断时，首页首屏 HTML 显示“暂时无法读取公开记录”，不显示 `0 篇公开记录` 或伪造空状态。
- 附件验收覆盖 Nest 返回的实际字节和 Next HTML 中的附件 URL；本切片未新增站点附件代理，部署时的同源 `/api/v1/assets/*` 路由仍需部署任务确认。

## 5. 实际验证证据

以下命令均在 ENGINE-001 worktree 中实际执行并通过：

| 命令 / 检查 | 实际结果 |
| --- | --- |
| `npx --yes pnpm@11.23.0 install --frozen-lockfile --registry=https://registry.npmjs.org/` | 5 个 workspace project，锁文件冻结安装成功 |
| `pnpm lint` | 36 个文件，0 warning / 0 error |
| `pnpm typecheck` | config、contracts、api、site 全部通过 |
| `pnpm test:unit` | 15 / 15 通过 |
| `pnpm test:integration` | 4 / 4 通过，启动真实 Nest HTTP |
| `pnpm build` | packages、Nest 与 Next 全部构建成功；两个页面均为动态 SSR |
| `pnpm test:e2e` | 1 / 1 通过，启动构建后的真实 Nest 与 Next 服务 |
| `pnpm content:validate` | 3 条合成记录，1 条公开，快照有效 |
| `pnpm docs:validate` | 127 份文档、27 条 catalog、14 个任务，0 error |
| `npm run dev -- --host 127.0.0.1 --port <动态端口>` | Nest ready、Next 首页 200、详情 200，退出清理通过 |

端到端断言覆盖：

- 首页含公开样本标题和 canonical 链接，不含私密 / 草稿 canary。
- 详情 HTML 含 `PUBLIC_SSR_PARAGRAPH_7F3A`、目录锚点和两类附件 URL。
- 私密与草稿详情均为 404，私密附件为 404，响应不含对应 canary。
- 旧 slug 返回 308 与 canonical ID。
- 停止 Nest 后，Next 返回可读故障页面而非空列表。
- 测试 `finally` 清理服务；开发启动实测后两个端口关闭，未发现残留 Next、Nest、tsx 或开发 Node 进程。

验证过程中实际修复了 tsx 下 Nest 构造器元数据依赖、pnpm 包级 Next 可执行文件定位、Next 16 的 `--hostname` 参数，以及生产模式 API 故障时首屏缺少友好错误内容的问题；最终回归均已通过。

## 6. 文档查阅与限制

2026-10-30 查阅了 Next.js、NestJS、Marked 与 pnpm 官方文档，用于确认请求时不缓存、异步路由参数、standalone 输出、Marked `engine.walkTokens(tokens, callback)` 和 pnpm workspace 行为：

- Next.js：<https://nextjs.org/docs>
- NestJS：<https://docs.nestjs.com>
- Marked：<https://marked.js.org/using_advanced>
- pnpm workspace：<https://pnpm.io/workspaces>

Context7 当时返回月度额度不可用，因此未将其作为本次验证证据，改用上述官方文档和本地实测。

## 7. 运行与交接

```bash
npx --yes pnpm@11.23.0 install --frozen-lockfile
npm run dev
# 或：
npm run dev -- --host 127.0.0.1 --port 3000
```

默认 Next 为 `http://127.0.0.1:3000`，Nest 为 `http://127.0.0.1:3001/api/v1`。环境示例见 [.env.example](../../../.env.example)，开发细节见 [scripts/dev/README.md](../../../scripts/dev/README.md)，站点边界见 [apps/site/README.md](../../../apps/site/README.md)。

本报告只证明本地合成样本、构建和 HTTP 链路自检结果。未验证真实内容迁移、生产部署包或反向代理、CI 工作流、身份登录、iPhone 真机、浏览器全量视觉回归、性能与安全专项验收；这些不能由本次机器自检或模拟结果替代。改动已提交到上述分支，未执行 push、合并或发布。
