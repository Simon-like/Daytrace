# 多 Agent 协作工作区

这里负责工作分配与交接，不运行自主Agent，不自动向其他聊天发消息。

## 谁维护什么

- `board.json` 是任务状态、归属、依赖与允许写入范围的唯一台账。
- `tasks/任务ID.md` 写目标、产物、验收和边界，不重复维护状态。
- `handoffs/` 每个任务/Agent独立交付；`reviews/` 记录证据、发现与是否可集成。
- 项目记忆、进度、目录索引和资产台账由集成者串行汇总，贡献者不并发覆盖这些文件。

角色是工作职责，不表示同时启动了多个Agent。Kimi的独立模块已由本聊天审阅并合并，当前本地成品Demo和真实浏览器证据见[DEMO-001报告](../docs/project/reports/DEMO-001.md)。任务精确状态以board为准，不能从旧“队列占位”说明推断当前实现进度。

最新授权：验收并持续开发到本地Demo。Next/Nest/pnpm方向固定，源码已建立，不重做选型/脚手架。后续QA/RELEASE依真实派发继续；本地演示不构成真实身份/真机/生产发布授权或验收。

## 任务流程

1. 读根AGENTS、项目记忆、任务卡及关联PRD/ADR。
2. 在中央checkout认领任务：`python3 scripts/task_claim.py claim ARCH-001 agent-name`。
3. 只写任务允许目录，读其他模块可以，跨边界变更先写交接提案。
4. 自检并保存证据，提交：`python3 scripts/task_claim.py submit ARCH-001 agent-name --evidence coordination/handoffs/ARCH-001-agent-name.md`。
5. 集成者评审、运行相关验证、处理冲突，再用 `complete` 登记评审记录并合并共享状态。

状态为queued、active、review、done、blocked。认领检查依赖并使用文件锁与原子写入；两个Agent同时认领同一任务只会有一个成功。文件锁只协调同一文件系统中的中央队列，不是跨电脑分布式锁，更不是文件访问权限。

若进程中断留下board.lock，协调者核对锁里的进程/时间与任务交接后再处理，不按超时自动抢占。脚本不会自动删除他人的锁或替换任务owner。

## 分支与集成

共同远端为 `git@github.com:Simon-like/Daytrace.git`，主分支为 `origin/main`。正式并行开发从最新主分支建立独立分支/worktree，命名如 `agent/ARCH-001/name`。中央board只在主checkout修改，worktree里的台账副本不作为协调源。

一个任务一个主要写入域；通用tokens/layouts、入口、路由、依赖/锁文件和内容协议由集成者维护。其他Agent提交明确变更，不同时修改共享核心。合并前检查基线差异、测试结果与未提交工作，不能用重置/覆盖清掉别人的改动。

源码可以通过Git提交/分支合并；报告和素材按任务ID定位；共享记忆仅作检索摘要。其他Agent不自动继承聊天，跨设备也不会自动同步。

## 交接最少信息

任务ID、owner、基线版本、修改文件、如何预览/运行、实际验证、未验证、风险、依赖、借鉴来源和建议下一步。模板见 `templates/`。不把“测试通过”写成一句没有环境或证据的结论。

技术选择以ADR为准；个人记录以content为准；研发经验进入knowledge；不要让交接报告变成另一套需求或技术事实来源。
