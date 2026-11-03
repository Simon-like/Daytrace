# 项目文档

所有项目说明都在这里。先按要做的事进入，不必把历史报告全部读完。

| 我现在要做什么 | 入口 |
| --- | --- |
| 启动并体验网站 | [Demo运行手册](development/demo.md) |
| 让Kimi或Codex接力 | [当前工作](context/当前工作上下文.md) → [共同协作协议](collaboration/README.md) |
| 看真实进度与剩余问题 | [项目进度](project/项目进度.md) |
| 修改功能或设计 | [产品需求](product/PRD-v1.0.md)、[视觉基线](design/视觉风格基线-v1.0.md)、[动效基线](design/动效系统基线-v1.0.md)、[技术架构](architecture/技术选型与研发路径.md) |

## 文档分区

- **context**：当前任务、稳定共识与最小上下文；不是第二个进度表。
- **product / design / architecture**：需求、视觉与资产索引、技术决定和接口契约。
- **development / operations**：开发、测试、内容维护、CI/CD和运维手册。
- **collaboration**：唯一任务台账、任务卡、交接、评审和共用模板。
- **knowledge**：可复用研发经验；**plans**：实施计划；**project**：阶段进度、报告和证据。
- **research / archive**：资料与历史记录；**templates**：内容和素材整理模板。

媒体和代码留在原目录，docs只存说明并链接过去。[文档管理规则](architecture/项目结构与文档治理.md)规定各类信息的唯一位置。

<details>
<summary>全部权威文档索引（按需展开）</summary>

<!-- catalog:start -->
| 文档 | 用途 | 状态 | 维护职责 |
| --- | --- | --- | --- |
| [上下文管理入口](context/README.md) | 稳定共识、当前工作与任务接力 | active | 协调与集成 |
| [当前工作上下文](context/当前工作上下文.md) | 最新用户要求与本轮边界 | active | 集成 |
| [任务上下文模板](context/任务上下文模板.md) | 独立任务的最小接力包 | reference | 各Agent |
| [产品需求与立项](product/PRD-v1.0.md) | 范围、用户流程和18项P0要求 | baseline | 产品与集成 |
| [正式验收矩阵](product/验收矩阵-v1.0.md) | AC与非功能测试门槛 | baseline | 测试与集成 |
| [视觉风格基线](design/视觉风格基线-v1.0.md) | D/D²、手写与视觉约束 | baseline | 设计 |
| [模块页面设计](design/模块页面设计-v1.0.md) | M1模块原型规范，正式运行行为见Demo报告与代码 | reference | 设计与前端 |
| [项目结构与文档治理](architecture/项目结构与文档治理.md) | docs集中管理、唯一事实源与防散落约束 | active | 集成 |
| [ADR-0001结构决策](architecture/decisions/ADR-0001-项目分层与协作边界.md) | 仓库组织与协作边界 | accepted | 集成 |
| [ADR-0002全栈技术方向](architecture/decisions/ADR-0002-技术路线候选.md) | Next/Nest/monorepo决定、代价与待验证条件 | accepted | 架构 |
| [全栈技术架构与研发路径](architecture/技术选型与研发路径.md) | 模块/数据/渲染/部署边界与分阶段实施 | baseline | 架构与安全 |
| [Kimi / Codex共同协作协议](collaboration/README.md) | 唯一中央队列、认领、worktree、交接与评审 | active | 协调与集成 |
| [工程知识库](knowledge/README.md) | 可复用经验与操作流程 | active | 各模块与集成 |
| [个人内容库](development/content.md) | 站点正文、公开私密与样本隔离 | active | 内容与安全 |
| [项目进度](project/项目进度.md) | 实际阶段、证据与下一步 | active | 集成 |
| [阶段路线图](project/项目路线图与阶段管理.md) | M0至M5基线和退出门槛 | active | 产品与集成 |
| [产品与项目决定](project/决策记录.md) | 用户确认与建议的区别 | active | 产品与集成 |
| [M0立项报告](project/reports/M0-立项报告-2026-10-30.md) | 立项交付与检查记录 | reference | 产品 |
| [M1模块稿进展](project/reports/M1-模块排版与响应式进展-2026-10-30.md) | 91组布局与10组原型交互证据 | reference | 前端与测试 |
| [M1协作结构报告](project/reports/M1-协作结构与技术选型准备-2026-10-30.md) | 本轮结构、校验与版本基础 | reference | 集成 |
| [移动Markdown调研](research/移动端Markdown阅读调研.md) | 原始资料与渲染候选 | reference | 架构 |
| [设计资源调研](research/设计资源库.md) | 工具候选与资料来源 | reference | 设计 |
| [历史需求草案](archive/产品需求草案-2026-10-30.md) | 保留早期需求与决策过程 | historical | 集成 |
| [ADR-0003 CI/CD与发布治理](architecture/decisions/ADR-0003-CI-CD与发布治理.md) | 可信构建、同产物晋级、权限与恢复决定 | accepted | 架构与运维 |
| [CI/CD与运维建设方案](architecture/CI-CD与运维建设方案.md) | PR检查、环境、发布/回滚/恢复与实际门槛 | baseline | 工程与运维 |
| [研发交接与任务编排](architecture/研发交接与任务编排.md) | Agent入口、分工顺序、写入职责与完成定义 | active | 协调与集成 |
| [M1全栈架构与CI/CD报告](project/reports/M1-全栈架构与CI-CD建设-2026-10-30.md) | 技术确认、文档交付、验证与未完成边界 | reference | 架构与集成 |
| [全栈Demo验收报告](project/reports/DEMO-001.md) | Kimi接力事实、成品运行、真实测试与发布差距 | reference | 集成与验收 |
| [Demo运行手册](development/demo.md) | 启动全栈演示、版本和合成身份边界 | active | 开发与集成 |
| [本地开发手册](development/local-dev.md) | 工程开发命令、端口与进程清理 | reference | 开发 |
| [CI/CD运行说明](operations/cicd.md) | 配置变量、受控脚本与实际运维前提 | active | 运维 |
| [设计资产索引](design/资产索引.md) | 素材源文件、来源和采用状态 | active | 设计 |
| [ADR-0004文档集中决策](architecture/decisions/ADR-0004-项目文档统一到docs.md) | 文档归位及Kimi/Codex共用协议 | accepted | 集成 |
| [文档收敛验收报告](project/reports/DOCS-001.md) | 迁移清单、引用修复、脚本回归与保留现场 | reference | 集成 |
| [动效系统基线](design/动效系统基线-v1.0.md) | 阅读优先的动效令牌、组件契约、减少动态效果与性能验收 | baseline | 设计与前端 |
| [阅读型产品动效调研](research/2026-11-02-阅读型产品动效调研.md) | 优秀团队方法、官方来源与技术取舍 | reference | 设计与前端 |
| [Markdown 渲染与内容管理方案](research/2026-11-03-Markdown渲染与内容管理方案.md) | 官方资料与源码核对、快捷上传、内容目录和文章路由实施建议 | reference | 内容与架构 |
| [主人内容管理 API v1](architecture/contracts/content-management-v1.md) | 上传预览、版本发布、回滚导出和受控别名解析接口 | active | 内容与安全 |
<!-- catalog:end -->

</details>

目录由catalog.json维护，运行 `python3 scripts/project_check.py --write-index` 更新生成区。报告是当时的证据，不代表现在的状态；最新状态看当前工作与进度。
