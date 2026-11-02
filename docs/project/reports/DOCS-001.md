# DOCS-001：项目文档收敛报告

日期：2026-11-02。基线：d1d34b3。执行者：codex-docs。用户要求项目文档集中docs，方便Kimi和Codex接力；本轮不改变业务、视觉或生产部署。

## 1. 收敛结果

迁移96项文件（含项目说明、中央台账与目录占位）；移除3个重复跳转页。逐文件old→new见[迁移清单](../migrations/2026-11-02-docs.json)。没有创建新旧两套目录或复制设计大文件。

| 原位置 | 现在的位置 |
| --- | --- |
| 根coordination | docs/collaboration；唯一board、任务卡、交接、评审 |
| 根knowledge | docs/knowledge |
| 根templates | docs/templates |
| 应用/脚本/测试/内容目录README | docs/development |
| ops中的运行说明 | docs/operations；脚本/Compose/Docker原位 |
| design的规范、索引、交付、提示词 | docs/design及records；图像/原型原位 |
| 实验README/handoff | docs/archive/experiments；实验代码/fixture原位 |
| docs/superpowers/plans | docs/plans |
| docs根项目记忆 | docs/context/项目记忆 |

根README现在只负责启动和导航，根AGENTS是Kimi/Codex共同入口。必要局部AGENTS是薄指针；未创建KIMI/Codex两套项目规则、全局配置或状态镜像。

## 2. 协作规则与维护

[共同协作协议](../../collaboration/README.md)覆盖owner命名、认领、分域、独立worktree、跨设备单协调者、交接与真实评审。当前工作/稳定共识/阶段进度分离，报告仅作历史证据，不再各处复制最新状态。

认领工具唯一读取docs/collaboration/board.json，新增只读status和显式--root；默认拒绝worktree副本与无Git的台账副本。保留原子锁、依赖与重叠范围检查，修复台账的card/evidence/review/history与允许路径。

文档检查新增落位规则：版本管理的项目说明必须在docs；根README/薄AGENTS和站点Markdown/fixture例外。CI原有docs检查自动覆盖此规则。未知未跟踪素材不强制删除，加入版本管理后同样受门槛约束。

链接按原目录解析后重算，Markdown中的图片仍指向真实素材，不把它们复制到docs。更新目录索引、根入口、当前上下文和稳定记忆；旧路径可由迁移表或Git历史追溯，不再留同义跳转页。

## 3. 验证

- 迁移前新增文档治理测试先失败，因旧工具没有新board路径和落位规则；实现后foundation共11项通过。
- 核验132个受保护应用/内容文件哈希保持不变，不含按本轮规则改写的薄AGENTS或迁移的项目说明。
- project_check检查链接、catalog、台账、知识元数据、文档位置；提交前后均执行。
- CI配置回归、TypeScript检查与Demo HTTP冒烟的最终结果见[验证记录](../evidence/DOCS-001/verification.json)。本报告不冒充独立评审或生产/真机验收。

根coordination/knowledge/templates已无权威文件；旧worktree仍是原分支快照，接力前同步主分支，不在其中继续运行旧路径认领工具。

## 4. 保留现场与后续

接手时已有两份未提交ARCH实验JSON与未跟踪重复图标目录，原样保留，未覆盖作者worktree。站点正文/附件、设计媒体与运行中的业务数据没有迁入docs；本轮无业务代码改动，也未执行发布。

以后从[docs首页](../../README.md)进入；协作先读根AGENTS与当前工作，新增说明直接归正确目录。默认以版本管理文件治理，用户未知未跟踪文件不在本次自动清理范围。具体Kimi桌面接入若不自动读取AGENTS，首条任务显式要求读取，不假设双方共享聊天。
