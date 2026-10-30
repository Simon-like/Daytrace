# Project Collaboration Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可交接、可校验的多Agent项目结构和文档/工程知识/个人内容分层，并准备技术选型与迭代任务。

**Architecture:** 单仓库、单正式应用边界、功能模块分工。保留全部探索资产原路径，研究和旧草案迁入明确目录并保留兼容入口；一个中央任务队列串行认领，各Agent独立交付，集成者合并共享文件。

**Tech Stack:** 本轮仅Python标准库、JSON、Markdown和本地Git，不安装正式框架，不创建远程仓库。本轮内联执行。

## Global Constraints

- 保留D/D²与手写风格，当前模块原型先收敛，不再增加新主题。
- 保护原型相对路径和旧文档入口；不得把设计原型当正式内容/权限实现。
- 私密个人内容与凭据不进入普通Git提交或公开构建集合。
- 先建目录与契约边界；Astro/Nuxt/Next选型通过小验证后再锁定版本和依赖。

## 文件职责

| 路径 | 责任 |
| --- | --- |
| apps/site/ | 正式应用预留；README与模块目录，无框架脚手架 |
| content/ | 未来站点个人记录；public/private/样本隔离 |
| knowledge/ | 项目研发的可复用认识与操作方法，按证据和状态维护 |
| docs/README.md、catalog.json | 文档权威入口和可生成目录 |
| docs/architecture/ | 结构ADR、技术候选与研发路径 |
| coordination/ | 中央队列、任务卡、交接/评审模板 |
| scripts/project_check.py | 默认只读，校验队列/链接/目录同步；--write-index仅生成目录块 |
| scripts/task_claim.py | 带文件锁和原子写入的本地认领/状态管理；不派发消息 |
| tests/foundation/ | 队列并发认领、依赖、路径与状态的实际行为测试 |
| .gitignore、.editorconfig | 本地依赖、秘密、私密记录隔离和通用文本约定 |

## Task 1：目录与文档迁移

- [ ] 建立上述目录和各边界README/AGENTS，保留design下既有可运行资源。
- [ ] 把研究全文移到docs/research、旧草案到docs/archive；按新目录重算文内相对链接；旧路径改为清楚的转向入口。
- [ ] 建立catalog.json，并以生成块维护docs/README目录，记录唯一权威位置。

## Task 2：协作队列与真实约束

- [ ] 使用任务ID、依赖、owner、允许写入路径、状态和完成证据建立board.json和任务卡。
- [ ] 实现单checkout文件锁及原子替换；认领已有owner或依赖未完成时失败；任务推进到done必须先有交付/评审证据。
- [ ] 测试两个并发认领只有一个成功，依赖未就绪拒绝、非法状态拒绝、路径边界拒绝。

## Task 3：技术选择与研发任务

- [ ] 以官方资料对比Astro、Nuxt Content、Next.js；明确推荐、边界、待验证与不自动安装。
- [ ] 建立ARCH-001/CONTENT-001/SECURITY-001等独立任务，设置PoC范围及技术冻结门槛。
- [ ] 以公开Markdown垂直切片、私密边界、页面迁移、真机与发布串接既有M1–M5。

## Task 4：检查、版本与交接

- [ ] 执行 `python3 scripts/project_check.py --write-index` 与只读检查。
- [ ] 执行 `python3 -m unittest discover -s tests/foundation -v`。
- [ ] 初始化本地Git，核实忽略私密/凭据/依赖；在有可用作者身份时建立本地基线提交，未推送远端。
- [ ] 更新记忆、进度、资产入口与结构报告，明确正式技术栈仍待验证冻结。
