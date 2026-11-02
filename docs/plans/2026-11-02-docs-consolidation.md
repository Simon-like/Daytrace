# 项目文档收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> 用户要求直接收敛，本聊天顺序执行，不另启动Agent或等待执行方式确认。

**Goal:** 项目文档、任务和工程知识集中docs，Kimi/Codex使用同一接力协议，现有应用与个人Markdown数据不受迁移影响。

**Architecture:** docs/collaboration为唯一中央队列，docs/context为接手上下文，docs/development与operations为运行手册；设计媒体/可执行运维和实验代码仍在原目录。维护显式迁移表，修复链接/文本路径/任务引用，再更新脚本与测试。

**Tech Stack:** Markdown/JSON、Python校验与原子任务工具，现有pnpm/GitHub Actions。

## Global Constraints

- 保留用户最初两份未提交ARCH证据、未跟踪重复图标目录和所有作者worktree。
- root只留README/AGENTS薄入口；局部AGENTS薄适配，实质规则在docs；网站正文/fixture不是项目文档。
- 不改业务实现、视觉、认证或真实私密材料，不重写历史测试结果。
- 不复制Kimi与Codex两套项目规则；中央owner保持唯一，独立worktree不各写台账。

## Task 1：登记与迁移

Files: docs/plans、本轮迁移映射；coordination → docs/collaboration；knowledge → docs/knowledge；templates → docs/templates；散落README/交付说明迁入docs。

- [x] 认领DOCS-001；保存旧board和迁移表到.local，不覆盖原未提交文件。
- [x] 使用显式old→new映射迁移文件；不移动素材、源代码、Markdown数据。
- [x] 重算Markdown相对链接，结构化board/card/evidence/history及catalog同步更新；删除3个重复跳转页，不留两份权威源。

## Task 2：统一协作入口

Files: README.md、AGENTS.md、docs/README.md、context、collaboration、development、operations、architecture/项目结构与文档治理。

- [x] 根AGENTS只引用共同入口与硬约束，局部AGENTS只指向docs规则。
- [x] 写清Kimi/Codex owner命名、分工、认领、独立分支/worktree、交接/评审、跨设备单协调者；不操作全局工具配置。
- [x] 最新上下文、稳定记忆和进度职责分开，过期报告只作证据。

## Task 3：脚本与回归

Files: scripts/project_check.py、task_claim.py、tests/foundation/test_coordination.py、新增文档治理测试、.gitignore。
Interfaces: `BOARD_RELATIVE`固定docs/collaboration/board.json；`transition(root, action, task, owner, evidence)`保持原接口；CLI新增只读status和显式--root。

- [x] 先增加会失败的迁移/布局测试：旧目录不再是台账源，新增散落说明会被拒绝，Markdown数据不会误报。
- [x] 原子锁/提交/评审使用新台账；worktree需显式中央root，禁止自动抢任务。
- [x] 运行foundation全部测试、project_check、CI配置检查与pnpm typecheck；应用HTTP冒烟证明仍能演示。

代表性断言：
```python
self.assertEqual(str(BOARD_RELATIVE), 'docs/collaboration/board.json')
self.assertTrue(document_policy_errors(root, [Path('apps/api/notes.md')]))
self.assertEqual(document_policy_errors(root, [Path('apps/api/fixtures/demo/public/example/index.md')]), [])
```

## Task 4：交付

Files: docs/project/reports/DOCS-001.md、迁移映射、中央交接与自检。

- [x] 核对版本管理的项目说明都在docs，根/局部入口和内容数据除外。
- [x] 提供迁移统计与当前唯一入口，保存修改前后数据哈希和旧路径映射，保留现场未提交文件。
- [x] 校验通过后提交并同步既有仓库，不把文档迁移描述成生产部署或独立评审。
