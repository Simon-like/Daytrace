# 有迹 · Daytrace

让技术实践、生活经验与个人感想容易留下、方便回看，看到自己的变化。

当前：Next.js（React）+ NestJS + monorepo技术方向已确认，采用TypeScript与pnpm workspace实施基线；D/D²与手写风格保持。架构与CI/CD文档已形成，正式工程、身份/私密链路与流水线尚未实现。

## 从这里开始

- Agent接手：[当前工作](docs/context/当前工作上下文.md) → [协作规则](AGENTS.md) → [项目记忆](docs/项目记忆.md) → 已授权任务。
- 上下文怎么组织：[上下文入口](docs/context/README.md)。
- 看文档：[文档目录](docs/README.md)，按产品、设计、架构、研究、报告查找。
- 研发接手：[任务编排](docs/architecture/研发交接与任务编排.md) → [全栈架构](docs/architecture/技术选型与研发路径.md) → [CI/CD建设](docs/architecture/CI-CD与运维建设方案.md)。
- 看进度：[阶段看板](docs/project/项目进度.md)与[路线图](docs/project/项目路线图与阶段管理.md)。
- 看页面：[模块稿运行入口](design/contributions/2026-10-30-codex-modules-v1/README.md)与[资产索引](design/资产索引.md)。

## 项目地图

```text
apps/site/      Next.js正式站点边界
apps/api/       NestJS目标目录，待ENGINE创建
packages/       contracts/config目标目录，待ENGINE创建
content/        主人未来展示的记录：公开、私密、合成样本
knowledge/      研发经验与操作方法
docs/           产品/设计/架构/研究/阶段报告/历史
design/         视觉资产与既有可运行原型
coordination/   任务、认领、交接、评审
experiments/    技术验证
tests/          协作工具与未来正式应用测试
scripts/        仓库校验和原子任务认领
templates/      个人内容整理模板
ops/            后续发布、备份和恢复文档
```

上述api/packages是已确定的目标结构，尚未创建应用或安装构建工具。固定site/api两个应用、必要共享包，不因分工拆微服务或微前端。本轮未启动其他Agent。

## 常用入口

```sh
python3 scripts/project_check.py
python3 -m unittest discover -s tests/foundation -v
python3 scripts/task_claim.py claim ARCH-001 agent-name
```

任务先读卡、认领再写入；规范见 [coordination](coordination/README.md)。更新文档目录使用 `python3 scripts/project_check.py --write-index`，普通校验不改文件。

内容、依赖、构建、凭据分别管理，私密内容不进普通Git。共同版本基线为 `origin/main`，远端是 `git@github.com:Simon-like/Daytrace.git`；正式并行任务从最新主分支建立独立分支或worktree。发布和私密备份仍另行落实，其他Agent不自动继承聊天。
