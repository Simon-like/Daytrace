# 项目文档入口

先按问题找权威来源，不必读取所有历史资料。

**当前先看 [上下文入口](context/README.md) 和 [当前工作](context/当前工作上下文.md)。本轮只定文档结构，技术选型留待共同讨论。**

- 接手：根AGENTS → 项目记忆 → 已认领任务 → 相关PRD/设计/ADR。
- 建什么：product；怎么落地：design与architecture；做到哪：project。
- 工具和资料：research；已被替代的草案：archive。
- 稳定共识、当前工作与任务接力如何衔接：context，不重复维护需求。
- 可复用经验：根knowledge；个人站点正文：根content；原始视觉和原型：根design。

以下表格由catalog.json生成，更新目录后运行 `python3 scripts/project_check.py --write-index`。目录块不要手改。

<!-- catalog:start -->
| 文档 | 用途 | 状态 | 维护职责 |
| --- | --- | --- | --- |
| [上下文管理入口](context/README.md) | 稳定共识、当前工作与任务接力 | active | 协调与集成 |
| [当前工作上下文](context/当前工作上下文.md) | 最新用户要求与本轮边界 | active | 集成 |
| [任务上下文模板](context/任务上下文模板.md) | 独立任务的最小接力包 | reference | 各Agent |
| [产品需求与立项](product/PRD-v1.0.md) | 范围、用户流程和18项P0要求 | baseline | 产品与集成 |
| [正式验收矩阵](product/验收矩阵-v1.0.md) | AC与非功能测试门槛 | baseline | 测试与集成 |
| [视觉风格基线](../design/视觉风格基线-v1.0.md) | D/D²、手写与视觉约束 | baseline | 设计 |
| [模块页面设计](design/模块页面设计-v1.0.md) | 当前原型模块和响应式行为 | active | 设计与前端 |
| [项目结构与文档治理](architecture/项目结构与文档治理.md) | 目录、单一事实来源和维护规则 | active | 集成 |
| [ADR-0001结构决策](architecture/decisions/ADR-0001-项目分层与协作边界.md) | 仓库组织与协作边界 | accepted | 集成 |
| [ADR-0002技术候选](architecture/decisions/ADR-0002-技术路线候选.md) | 技术路线状态与冻结门槛 | proposed | 架构 |
| [技术选型与研发路径](architecture/技术选型与研发路径.md) | 未共同讨论的候选笔记，当前不执行 | proposed | 架构与安全 |
| [多Agent协作入口](../coordination/README.md) | 认领、交接、评审与合并 | active | 协调与集成 |
| [工程知识库](../knowledge/README.md) | 可复用经验与操作流程 | active | 各模块与集成 |
| [个人内容库](../content/README.md) | 站点正文、公开私密与样本隔离 | active | 内容与安全 |
| [项目进度](project/项目进度.md) | 实际阶段、证据与下一步 | active | 集成 |
| [阶段路线图](project/项目路线图与阶段管理.md) | M0至M5基线和退出门槛 | active | 产品与集成 |
| [产品与项目决定](project/决策记录.md) | 用户确认与建议的区别 | active | 产品与集成 |
| [M0立项报告](project/reports/M0-立项报告-2026-10-30.md) | 立项交付与检查记录 | reference | 产品 |
| [M1模块稿进展](project/reports/M1-模块排版与响应式进展-2026-10-30.md) | 91组布局与10组原型交互证据 | reference | 前端与测试 |
| [M1协作结构报告](project/reports/M1-协作结构与技术选型准备-2026-10-30.md) | 本轮结构、校验与版本基础 | active | 集成 |
| [移动Markdown调研](research/移动端Markdown阅读调研.md) | 原始资料与渲染候选 | reference | 架构 |
| [设计资源调研](research/设计资源库.md) | 工具候选与资料来源 | reference | 设计 |
| [历史需求草案](archive/产品需求草案-2026-10-30.md) | 保留早期需求与决策过程 | historical | 集成 |
<!-- catalog:end -->

状态含义：baseline为当前产品/设计基线，active为持续维护的工作入口，proposed为尚待验证的建议，accepted为已落实的决策，reference为参考资料，historical为历史。

报告记录当时的结果，最新进度以项目进度为准；索引中“基线”不意味着每个技术参数已经由用户逐项批准。
