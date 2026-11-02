# CICD-001：CI/CD 与测试环境交付报告

- 日期：2026-10-30
- 分支：`agent/CICD-001/kimi`
- 基线：`0381904161d095dd8ca14c24a72a37ffa0cee9fa`
- 范围：`.github/`、`ops/cicd/`、`scripts/ci/`、`tests/cicd/` 与本报告
- 状态：本地实施与自检完成；未合并、未推送、未部署，未经过独立评审

## 1. 交付结果

已建立 PR/main CI、受信 main 镜像与 release manifest 起点，以及 staging、生产晋级和回滚的人工受控模板。生产默认关闭，没有读取或创建生产凭据，没有修改仓库保护规则、根 package/lock、业务代码或中央 board。

| 工作流 | 触发与职责 | 当前证据状态 |
| --- | --- | --- |
| `ci.yml` | PR/main 全量运行 repo、static、unit、integration、build、privacy、e2e；固定 `CI` 聚合状态 | 本地等价命令已跑；GitHub hosted run 未执行 |
| `release-build.yml` | 仅受信 main CI 成功后核验 SHA、构建/扫描/冒烟两镜像、推送 digest、生成清单 | YAML/脚本自测；镜像与 GHCR 未执行 |
| `deploy-staging.yml` | 人工选择 release run，核验受信证据，按 digest 部署并生成 staging 证据 | 配置与 Shell 检查；宿主部署未执行 |
| `promote-production.yml` | 人工确认，要求显式启用及同 release 的 staging 证据 | 仅默认关闭和证据校验自测；未触发生产 |
| `rollback.yml` | 人工确认，恢复历史已验证的完整镜像组合 | 仅模板与语法/证据检查；未执行回滚 |

CI 无 paths 跳过和 `continue-on-error`。聚合 job 使用 `if: always()` 并要求所有 needs 均为 `success`，因此 docs-only 也有确定结果，失败或取消不会变绿。外部 Action 全部固定完整 SHA，默认 `contents: read`，只有受信镜像 job 增加 `packages: write`。pnpm 缓存不包含会话、内容或凭据，所有安装仍冻结锁文件。

## 2. 构建与发布边界

- Next standalone 检查共享 contracts/config 是否进入服务端产物，复制并逐文件校验 `.next/static` 和 `public`。隐私检查直接启动 standalone，不只检查源码。
- API 镜像通过现有 `loadContentSnapshot` 投影导出公开运行快照，只复制 published + public 记录；空 `private/` 只满足启动目录契约。Next 镜像不读取内容源。
- Dockerfile 专用白名单 ignore 排除 private、`.env*`、密钥、依赖/构建输出及未列入白名单的 Git、design 等大文件。两运行镜像使用非 root `node`。
- 受信流程核验 workflow_run 的仓库、push/main、CI 路径、完整 SHA 和 main ancestry。镜像先经过 Trivy 可修复 HIGH/CRITICAL 阻断和双容器冒烟，再推送并记录 digest；清单保留 staging/批准为空，不伪造晋级。
- staging/production/rollback 从 main 执行部署脚本，按环境使用宿主 `flock`，先拉取 digest，再做 ready、公开页面、API 和匿名 401 检查，最后更新 `current`。失败尝试恢复上一完整组合，恢复失败明确报错。
- 生产必须设置 `DAYTRACE_PRODUCTION_ENABLED=true` 并输入确认文字；当前未设置。普通 workflow_dispatch 不被当成审批，正式启用仍需 RELEASE-001 核实环境保护、凭据隔离和授权。

## 3. 实际本地验证

最终在指定 worktree 执行 `bash scripts/ci/run-local.sh`，完整流程通过，耗时约 75.1 秒。该耗时是本机一次记录，不是 GitHub hosted 性能承诺。

| 检查 | 实际结果 |
| --- | --- |
| `python3 scripts/project_check.py` | 当时 131 份文档、27 条 catalog、14 个任务，0 error |
| foundation 协作工具测试 | 5 / 5 通过 |
| CICD workflow/容器边界 Python 测试 | 7 / 7 通过 |
| release manifest 与信任负例 Node 测试 | 3 / 3 通过；拒绝 mutable tag、短 SHA、HTTP 证据、错误分支/PR 来源 |
| `pnpm install --frozen-lockfile` | pnpm 11.23.0、5 个 workspace project 通过；首次 163 包，复跑复用存储 |
| `pnpm lint` | 36 文件，0 warning / 0 error |
| `pnpm typecheck` | config、contracts、api、site 通过 |
| `pnpm content:validate` | 3 条合成记录、1 条公开，快照有效 |
| `pnpm audit --audit-level high` | 单独实际执行，No known vulnerabilities found |
| `pnpm test:unit` | 15 / 15 通过 |
| `pnpm test:integration` | 4 / 4 通过，真实 Nest HTTP |
| `pnpm build` | packages、Nest、Next 通过；首页/详情保持动态 SSR |
| standalone | 共享代码追踪通过，16 个 static 与 1 个 public 文件复制并校验 |
| privacy | 1,288 个公开/standalone 文件、10 个 HTML/RSC/API 响应，7 个合成 canary 无泄露；匿名主人请求 401 |
| `pnpm test:e2e` | 1 / 1 通过，真实构建后 Nest + Next 链路 |
| Shell 语法 | remote deploy、host deploy、container smoke 均通过 `bash -n` |

额外实测：

- `node scripts/ci/export-public-content.mjs` 导出 1 条公开记录，公开运行修订为 `sha256:1b8111c7f5e2643ed87291a42bfd096d8a60c17569d96c565e14740da0957475`；导出树不含 PRIVATE/DRAFT canary。
- release manifest CLI 用合成 digest 实际生成并通过结构断言；这不是实际镜像 digest 或发布记录。
- 下载 actionlint 1.7.7 到已忽略目录，核验官方 release checksum 后检查全部工作流，0 error。
- 本机 `gh run view --help` 核实 JSON 字段后，将部署证据查询从不支持的 `path` 修正为 `workflowName`，复测通过。
- `git diff --check` 通过；根 `package.json`、`pnpm-lock.yaml` 和 `docs/collaboration/board.json` 无变更。

开发过程中隐私检查先因 standalone 的尾斜杠 308 和 RSC 404 语义失败，随后修正为跟随规范化跳转、按 RSC 协议验证 `NEXT_HTTP_ERROR_FALLBACK;404`，未删除 canary 或放宽最终 HTML/API 状态断言。完整复跑通过。

## 4. 未验证与外部条件

- Docker CLI 为 29.6.1，但 `docker info` 无法连接本机 daemon。因此 **Dockerfile、Trivy 镜像扫描、两镜像构建/运行、Compose 和 container smoke 均未实际验证**，不能标绿。
- 未执行 GitHub hosted PR/main CI、workflow_run、artifact 上传下载、GHCR 登录或推送；Action SHA 与工作流语法已检查，但不等于托管运行成功。
- 未配置或执行 staging 宿主、反向代理、DNS/TLS、镜像拉取身份、并发切换、失败恢复；生产晋级和回滚未触发。
- 未核实仓库可见性/套餐的环境保护能力，未修改 required checks 或仓库规则。集成者应将固定 `CI` 聚合检查设为 required，而不是分别维护易变 job 列表。
- 当前 E2E 是现有合成样本 SSR 链路，不代替后续 ACCESS/FIND、浏览器全视口、iPhone 真机、完整身份/附件/搜索/缓存及 QA/RELEASE 验收。
- pnpm audit 只代表执行时的漏洞数据库结果；Trivy 尚未跑。首次 hosted release 若发现可修复高危问题会按设计阻断，不能用 `continue-on-error` 绕过。

## 5. 后续接入顺序

1. 合并后先观察真实 PR/main CI，保留分段耗时、缓存命中与失败日志；将稳定 `CI` 状态接入保护规则。
2. 在有 Docker 的受信 runner 验证两镜像、Trivy、digest 清单和 GHCR 权限，再配置独立 staging 环境及合成数据。
3. 演练 staging 健康失败、同一 release 证据不匹配和并发发布，确认旧组合不受影响，再评估生产授权。
4. RELEASE-001 完成备份恢复、会话撤销、真实私密快照、回滚与恢复演练；在此之前保持生产关闭。

运行与变量说明见 `docs/operations/cicd.md`。本报告是机器自检记录，不冒充独立评审或部署证据。
