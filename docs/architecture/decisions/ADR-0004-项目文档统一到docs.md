# ADR-0004：项目文档统一到docs

- 日期：2026-11-02。
- 状态：accepted，用户明确要求文档收敛docs，并方便Kimi/Codex协作。

## 决定

项目说明、设计交付/提示词、开发运维手册、工程知识、计划、任务/交接/评审全部在docs。根只保留README与AGENTS入口，必要局部AGENTS为薄适配。

中央台账迁为docs/collaboration/board.json；原coordination、knowledge、templates文档目录不再作为权威根。素材、实验/部署/正式源码与站点Markdown数据保持原位置，链接与结构化引用修复，不复制大文件。

Kimi/Codex共用AGENTS与协作协议，不维护两套项目记忆。移除3个重复跳转页，Git和old→new迁移表保留可追溯性；旧worktree先同步后使用新脚本。

## 代价与验证

一次性迁移路径，旧外部本地链接可能需使用迁移表定位；本轮没有已发布文档站URL。目录治理检查纳入现有CI，原子任务脚本与测试同步更新，status和显式中央root便于多worktree使用。

新增散落项目说明会被拒绝；站点Markdown/fixture及薄入口例外。未知未跟踪素材保留，不以收敛名义删除。细则见[文档治理](../项目结构与文档治理.md)，证据见[DOCS-001](../../project/reports/DOCS-001.md)。

本决定增量调整ADR-0001的文档位置，不改变Next/Nest路线、私密边界或生产授权。
