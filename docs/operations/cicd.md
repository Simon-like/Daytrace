# CICD-001 运行与接入

本目录提供 GitHub Actions、镜像构建和受控部署起点。当前没有生产接入；工作流存在不等于 hosted CI、镜像或 staging 已执行。

## 本地复现

在仓库根目录运行：

```bash
bash scripts/ci/run-local.sh
```

该命令实际执行文档/协作检查、CICD 自测、固定 pnpm 11.23.0 的 frozen 安装、lint、TypeScript、内容校验、高危依赖审计、15 项单元测试、4 项集成测试、双应用构建、standalone、隐私扫描和 SSR E2E。它明确不执行 Docker、Trivy 镜像扫描、GitHub hosted runner 或远程部署。

隐私报告写入已忽略的 `tests/cicd/.artifacts/privacy-report.json`，只包含文件名数量、响应名称、状态与字节数，不包含正文或响应原文。公开快照与清单的本地输出写入已忽略的 `ops/cicd/.artifacts/`。

## CI 门槛

`.github/workflows/ci.yml` 对 PR 和 main push 全量运行，不做路径跳过。`repo`、`static`、`unit`、`integration`、`build`、`privacy`、`e2e` 任一失败都会使固定名称的 `CI` 聚合检查失败；取消也不会被当成成功。仓库保护规则需要集成者另行设置，本任务不修改规则。

所有外部 Action 固定完整 SHA。pnpm 缓存只覆盖内容寻址依赖存储，安装仍使用 `--frozen-lockfile`。CI 不读取生产 Secrets，默认权限只有 `contents: read`。

`build` 验证 Next standalone 中共享 contracts/config 已被追踪，并逐文件校验 `.next/static` 与 `public` 的复制结果。`privacy` 使用 standalone 启动真实 Next，扫描公开文件、HTML、RSC、API 和进程日志中的合成私密/草稿 canary，同时验证匿名主人请求为 401。

## 受信 main 镜像

`release-build.yml` 只接受 main push 上成功的 `CI` workflow_run：

1. 核验来源仓库、事件、main、CI 工作流和完整 SHA，并确认该 SHA 属于 `origin/main`。
2. 以 `linux/amd64` 构建 API/site 两镜像。Dockerfile 专用白名单 ignore 排除 Git、依赖、构建输出、private、凭据和设计资产；运行阶段使用非 root `node`。
3. API 构建通过现有 `loadContentSnapshot` 投影导出公开快照，只将 published + public 记录带入运行镜像；空 `private` 目录仅满足启动目录契约。
4. 推送前用固定 SHA 的 Trivy Action 阻断两镜像中可修复的 HIGH/CRITICAL 漏洞，再启动两镜像检查非 root、ready、完整 HTML、静态 CSS、匿名 401 和运行时公开 contentRevision。
5. 推送 SHA 标签，记录返回的不可变 digest，生成 `daytrace.release/v1` 清单并上传 `release-candidate` artifact。清单中的 staging/批准字段初始为空，不冒充已晋级。

GHCR 目标为 `ghcr.io/<owner>/daytrace/api` 与 `ghcr.io/<owner>/daytrace/site`，只有该 job 拥有 `packages: write`，使用当前受信 workflow 的 `GITHUB_TOKEN`。宿主为 arm64 或需要其他镜像仓库时，必须修改并重测平台/登录配置，不能直接复用 amd64 结论。

## staging 接入前提

`deploy-staging.yml` 只能手动选择成功的 release-build run。脚本从 main 读取，清单和运行证据必须匹配。staging 使用独立公开快照、合成私密样本和测试身份，不挂载生产卷。

GitHub `staging` 环境需要配置：

| 类型 | 名称 |
| --- | --- |
| vars | `STAGING_DEPLOY_HOST`、`STAGING_DEPLOY_USER`、`STAGING_DEPLOY_PORT` |
| vars | `STAGING_DEPLOY_DIRECTORY`、`STAGING_CONTENT_ROOT`、`STAGING_PUBLIC_ORIGIN` |
| vars（可选） | `STAGING_SITE_BIND`、`STAGING_SITE_PORT` |
| secrets | `STAGING_DEPLOY_SSH_KEY`、`STAGING_DEPLOY_HOST_KEY` |

宿主需要 Linux、Docker Compose、`jq`、`curl`、`flock`，以及已配置的最小权限镜像仓库拉取身份。`STAGING_CONTENT_ROOT` 必须含 `public/` 和 `private/`；站点入口前需要已有反向代理，把 `/api/v1/*` 转到 API 容器网络，其余请求转到 Next。部署只绑定 `127.0.0.1`，不会自行配置公网代理或证书。

部署按环境使用宿主 `flock`，先拉取 digest，再启动并检查 ready、公开 HTML、API 和匿名 401，最后原子更新 `current`。失败会尝试恢复上一完整镜像组合；恢复失败会明确变红。成功后上传不含正文的 `staging-evidence`。

## 生产与回滚

`promote-production.yml` 和 `rollback.yml` 都是手动入口，且只有仓库变量 `DAYTRACE_PRODUCTION_ENABLED=true` 才会越过 guard。未设置、非 `true` 或确认文字不符会失败关闭。普通手动按钮不等于审批；正式启用前仍需核实 GitHub 环境保护、发布负责人权限和独立授权。

生产晋级必须同时提供 release-build run 和同一 release 的 staging run，脚本核对 main 来源、Git SHA 和两项 digest 后才接触生产环境凭据。生产变量/Secrets 以 `PRODUCTION_` 前缀对应 staging 配置，但主机、目录、内容根和密钥必须完全独立。回滚同样要求历史 release 与 staging 证据，不执行破坏性数据库降级；数据恢复属于 RELEASE-001 的独立演练。

当前不设置 `DAYTRACE_PRODUCTION_ENABLED`，不创建 Secrets，不触发 staging、生产或回滚。
