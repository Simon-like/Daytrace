> 文档已集中管理。原素材/实验目录：[experiments/ARCH-001](../../../../experiments/ARCH-001)。文中“本目录”和历史运行步骤以该原目录为准；验收状态保持原记录。

# ARCH-001 交接

日期：2026-10-30。执行分支：`agent/ARCH-001/kimi`。基线：`203d20409b7537c369e7404eaca6e705299b51d5`。合并/部署状态：未合并 main、未推送、未部署；本交接是自检证据，不是独立评审。

## 交付与运行

交付位于 `experiments/ARCH-001`：Next/Nest 双应用、共享契约、公开/合成私密 Markdown、单元与端到端测试、预算测量、standalone 准备脚本、待验证 Docker 配置和 JSON 证据。阶段报告为 `docs/project/reports/ARCH-001.md`。

主要文件：

- `apps/site/`：App Router、动态文章页、服务端 API 适配、Next standalone 配置。
- `apps/api/`：Nest 模块、公开内容服务、Markdown/清洗、错误过滤与单测。
- `packages/contracts/`：跨端运行时契约及负例。
- `content/public/`、`content/private/`：公开、非法、危险输入和合成私密 canary。
- `scripts/`：本地 pnpm/bootstrap、启动、standalone 准备、版本留证和端到端预算验证。
- `evidence/`：版本、standalone、端到端预算和环境 JSON。
- `Dockerfile.site`、`Dockerfile.api`、`compose.yaml`：未实测的容器起点。
- `README.md`：运行入口；`docs/project/reports/ARCH-001.md`：阶段报告。

```bash
cd experiments/ARCH-001
./scripts/bootstrap.sh
./scripts/pnpm.sh verify
./scripts/pnpm.sh start
```

`bootstrap.sh` 通过 npm 把 pnpm 安装到实验目录 `.tools`，不依赖全局 pnpm/Corepack；随后运行 frozen lockfile 安装。`start` 访问 `http://127.0.0.1:4100/records/public-arch-sample`，`Ctrl+C` 停止。

## 推荐精确版本与选择依据

选择/查阅日期：2026-10-30。版本发布日期、registry latest 快照和 engines 见 `evidence/version-matrix.json`。

| 项 | 推荐版本 | 实测/选择依据 |
| --- | --- | --- |
| Node.js | 24.22.1 | 用户给定宿主版本；官方仍列为 LTS，darwin/arm64 全链路实测 |
| Next.js | 16.4.3 | 选择日官方 npm latest；Node >=20.9；生产构建/SSR/standalone 实测 |
| React / React DOM | 19.3.1 / 19.3.1 | Next peer 接受 React 19；peer 检查和构建通过 |
| Nest common/core/platform-express | 12.3.2 / 12.3.2 / 12.3.2 | 同版本对齐，peer 检查和真实 API 通过 |
| TypeScript | 7.0.2 | 双端类型检查通过；CommonJS 包须使用 NodeNext，旧 node10 已移除 |
| pnpm | 11.23.0 | Node >=22.13；`allowBuilds`、workspace、frozen 安装实测 |
| Markdown | marked 18.1.2 + gray-matter 4.0.3 + sanitize-html 2.18.1 | Node 24 engines 兼容；公开渲染和危险输入负例通过 |

pnpm 12.16.1 在本机 registry 组合下反复警告无法记录 packageManager pin，并导致 frozen 安装失败；没有把该版本留作未解决基线。11.23.0 的 frozen 安装实际通过。选择 Node 24 不代表否认 Node 26 已发布，而是遵守本次宿主前提。官方来源：[Node release](https://nodejs.org/en/about/previous-releases)、[Next output tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)、[pnpm allowBuilds](https://pnpm.io/settings/build#allowbuilds)。

## 实际验证与数字

环境：macOS arm64、Node 24.22.1、生产构建、真实 Nest 进程 + Next standalone 进程。

复现性修复：旧 `pnpm-lock.yaml` 含 103 个内网 HTTP tarball URL，仅把 `.npmrc` 切到官方 registry 不会重写这些既有条目；已有 `node_modules` 时，即使删除锁文件也可能继续沿用旧安装状态。本次移除旧锁和各 workspace 依赖目录，用固定 pnpm 11.23.0 从 `https://registry.npmjs.org/` 全量重建为仅含 integrity 的解析记录，再删除 `.tools`、`.pnpm-store`、所有依赖目录和构建产物，原样执行 `bootstrap.sh && pnpm.sh verify`。冻结安装重新下载 161 个包，供应链策略检查通过；未放宽或关闭任何策略。旧锁在本机是否立即报错会受供应链验证缓存和内网可达性影响，但旧 URL 与官方元数据不一致是确定的锁文件缺陷。

- frozen lockfile 安装：通过；`pnpm peers check`：无问题。
- TypeScript：通过；Node test：6/6 通过。
- Next 生产构建：`/` 静态，`_not-found` 静态，`/records/[slug]` 动态 SSR。
- 公开 Markdown → Nest API → 共享运行时契约 → Next SSR：完整 HTML 含 `PUBLIC_SSR_PARAGRAPH_7F3A` 和实际 `<h2>`。
- 私密 API/SSR：404；与不存在记录使用相同错误码和消息；无正文/标题 canary。
- 错误定位：非法日期返回 422、`CONTENT_INVALID`、`content/public/invalid-arch-sample.md`、`date` 和 requestId，无 stack 字段。
- 清洗单测：TypeScript 合成输入中的 script 与 javascript URL 被移除，安全文本保留。
- canary 扫描：12 个客户端静态文件、1241 个 standalone 文件，无合成私密正文/标题。
- standalone：共享契约和版本标记位于 `bundled-server-chunk`，静态资源复制后真实 SSR 成功；不是仅靠检查文件存在。

预算方法：从生产 SSR HTML 提取全部 script 和 stylesheet URL，以 `Accept-Encoding: gzip` 发真实 HTTP 请求；gzip 大小由实际响应体重算，传输大小按线上响应体字节累计。没有使用 Next 构建摘要代替 gzip。

| 指标 | 实测 | 预算 | 结论 |
| --- | ---: | ---: | --- |
| 必要 JS | 178358 B / 174.18 KiB gzip，8 请求 | 81920 B / 80 KiB | **失败，超出 94.18 KiB** |
| 首屏必要传输 | 181537 B / 177.28 KiB | 819200 B / 800 KiB | 通过，余量 622.72 KiB |
| HTML 传输 | 2627 B gzip | 包含于首屏 | 实测 |
| CSS 传输 | 552 B identity | 包含于首屏 | 实测 |
| 字体 / 图片 | 0 请求 / 0 B | 包含于首屏 | 仅因样本使用系统字体、无图 |

相较修复前证据，必要 JS 减少 31 B（0.03 KiB），首屏必要传输减少 26 B（0.03 KiB）；两项预算结论均无变化。

## 未验证

- Docker daemon socket 不存在；镜像构建、容器内双服务、Compose、非 root 文件权限、目标 Linux 架构均未运行验证。
- 无真实身份/会话/主人授权、真实私密附件、搜索索引、CDN/公共缓存、退出/过期或双会话验证；合成 404 隔离不等于 SECURITY/ACCESS 完成。
- 无真实字体、正文图片、长文、移动视口、iPhone Safari、LCP/INP/CLS 或真实用户数据；0 B 字体/图片不能外推。
- 无独立评审、CI workflow、生产部署、发布/回滚/恢复演练。

## 风险与 ENGINE 注意点

1. **JS 预算是未解决门槛。** 即使页面没有自定义 Client Component，Next 16.4.3 基线仍为 174.18 KiB gzip。ENGINE/QA 必须保留同一测量方法，分析框架/runtime/navigation chunk；不能宣称 NFR-01 通过或静默提高 80 KiB。若需例外，记录页面、理由和评审结论。
2. TypeScript 7 不再接受 `moduleResolution: "Node"` 对应的 node10；本样本共享包/API 使用 `NodeNext`，包 `type: commonjs`，构建产物仍为 CommonJS。
3. pnpm 11+ 使用 `pnpm-workspace.yaml` 的 `allowBuilds`。这里只允许 esbuild 执行构建脚本，明确拒绝不需要的 watcher/bufferutil/utf-8-validate；不要改成全量放行。
4. `outputFileTracingRoot` 指向实验 monorepo 根。Turbopack 将 workspace 契约内联进服务端 chunk，未复制独立 `packages/contracts/dist`；验证应检查实际 chunk 和运行时行为，不要硬编码 hash 或假设包路径。
5. standalone 不自动带 `.next/static`/`public`；`scripts/prepare-standalone.mjs` 必须进入构建/镜像流程。Next 内部 API 地址保持服务端运行时变量，不能改成 `NEXT_PUBLIC`。
6. 本样本为公开请求使用 `no-store` 以先证明运行时链路；正式公开缓存/contentRevision 策略由 ENGINE 后续实测，私密响应仍需独立缓存边界。
7. Docker 配置是合理起点而非证据。API 容器需 `HOST=0.0.0.0`，宿主默认仍绑定 127.0.0.1；CICD 首次运行要检查 pnpm frozen、共享包、静态资源、内容只读挂载和私密构建上下文排除。
8. CONTENT-001 的最终字段和 SECURITY-001 的身份方案优先；本实验契约版本 `1.0.0-arch.1` 仅为 PoC，不应反向成为正式协议。
