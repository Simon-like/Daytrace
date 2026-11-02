# DOCS-001交接

- 日期：2026-11-02；工具：Codex；owner：codex-docs；基线：d1d34b3。
- 用户要求：项目文档集中docs，方便Kimi/Codex接力。

已迁移96项文件（93份Markdown），删除3个重复跳转入口。协作/知识/模板、开发运维说明、设计元数据和实验文档按职责收进docs；代码/素材/站点Markdown数据原位。根README/AGENTS为薄入口，局部AGENTS引用docs规则。

台账唯一位置docs/collaboration/board.json；task_claim新增只读status、显式--root和中央checkout检查。卡片/证据/目录/链接同步迁移，防散落规则进入现有CI文档检查。

验证：foundation11项、CI配置7+3项、pnpm typecheck通过，5个Demo HTTP入口200；132应用文件与全部站点/实验Markdown数据字节核验未变。证据见[验证记录](../../project/evidence/DOCS-001/verification.json)，明细见[报告](../../project/reports/DOCS-001.md)与[迁移映射](../../project/migrations/2026-11-02-docs.json)。

原两份ARCH未提交证据、未跟踪重复图标与作者worktree保留。本轮无生产发布，也不重跑无关页面功能验收。其他Agent先同步主分支再读AGENTS和当前工作；不继续用旧coordination路径或旧worktree台账。提交/远端状态查实际Git。
