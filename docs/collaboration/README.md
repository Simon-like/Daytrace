# Kimi 与 Codex 共用协作协议

项目只维护这一套规则和一份[中央台账](board.json)。工具不同，不另建各自的PRD、项目记忆或进度表。根[AGENTS.md](../../AGENTS.md)是共同入口；不要用初始化命令覆盖成另一套独立规则。

Kimi Code官方说明支持项目AGENTS.md；桌面版或其他接入若未自动载入，首条任务显式要求读取根AGENTS与当前工作，不假设聊天记忆自动共享。[Kimi官方说明](https://moonshotai.github.io/kimi-code/en/customization/agents)

## 接手只读四处

1. [当前工作](../context/当前工作上下文.md)：最新用户范围、正在做什么、现场限制。
2. [稳定共识](../context/项目记忆.md)：产品/风格/技术，不复制聊天全文。
3. [board](board.json)与自己的任务卡：owner、依赖、允许写入路径、交付。
4. 与任务有关的PRD/设计/ADR；历史资料只有需要时再读。

## 认领与交付

owner建议使用`kimi-任务ID-短名`或`codex-任务ID-短名`，例如`kimi-READER-002-main`。已有历史owner保留。owner是当前负责人标识，不等于系统权限或自动运行的Agent。

```sh
python3 scripts/task_claim.py status
python3 scripts/task_claim.py claim TASK-001 codex-TASK-001-main
python3 scripts/task_claim.py submit TASK-001 codex-TASK-001-main --evidence docs/collaboration/handoffs/TASK-001-codex.md
python3 scripts/task_claim.py complete TASK-001 reviewer-name --evidence docs/collaboration/reviews/TASK-001-review.md
```

上面的TASK-001是说明占位名，执行时换成board中实际派发的ID。不能因为queued或依赖满足就自动开始所有任务。卡片写范围和验收，状态只写board；评审文件写判断和证据，不维护第三份状态。

一项工作一个owner、一个主要写入域。需要接管未完成任务时先留下原owner交接与用户/协调者的实际派发依据，不静默抢任务或删除锁。脚本保留依赖、原子写入和重叠范围检查；中断锁由协调者核对进程后处理。

## 分支、worktree和多设备

长期只维护两个开发入口：

- `dev`：唯一日常开发分支。所有功能、修复、文档和开发成果先提交到这里，查看开发成果直接切换并启动`dev`。
- `main`：稳定集成分支，只通过用户或集成者明确执行的`dev → main`合并更新。合并不等于部署或正式QA通过。

不再新建`agent/TASK-ID/short-name`等任务分支。任务ID继续用于board、owner、提交说明和证据关联，不再映射成长期Git分支。既有agent分支只作历史记录，不自动删除，也不作为后续开发入口。

日常开始与提交：

```sh
git switch dev
git pull origin dev
# 完成修改、验证和提交后
git push origin dev
```

每轮实质改动完成并验证后必须独立commit并推送`dev`，没有提交的轮次不算收尾。按功能、修复、文档和集成边界组织提交，不把多轮无关改动堆在工作区或一个大提交；临时验证产物、真实私密数据与凭据仍不得入库。提交只表示开发成果已留痕，不等于合并`main`、部署或验收通过。

共享路由、契约、依赖与锁文件仍由集成者串行处理。worktree不能另建交付分支；确需使用时也必须服从`dev`／`main`两分支模型和中央协调。同机worktree的台账副本**不能作为中央状态**，认领仍使用主checkout或显式`--root`：

```sh
python3 scripts/task_claim.py --root /path/to/primary-checkout status
python3 scripts/task_claim.py --root /path/to/primary-checkout claim TASK-001 kimi-TASK-001-main
```

跨设备的文件锁无效，由一个中央协调者实际认领并串行同步`dev`，不能各自写board后直接覆盖。此约定不自动联系另一个聊天或启动Agent。

## 收尾最少交什么

使用[交接模板](templates/交接模板.md)：任务/工具/owner、基线与提交/PR、修改范围、可复现命令及实际结果、未验证与风险、下一步。提交号与部署状态据实际结果填写，不把源码存在当运行成功。

评审使用[评审模板](templates/评审模板.md)。自检明确写自检，不能改个名字冒充独立审核；集成完成不等于已部署。当前工作只写最新现场，稳定共识只写长期决定，进度只在[项目进度](../project/项目进度.md)。

## 文档与数据边界

项目说明、handoff、计划、运行手册、设计说明和知识都写docs。代码与媒体仍在apps/packages/design/ops/experiments；实际站点Markdown/fixture留在数据目录。

不覆盖他人未提交修改，不改作者worktree来制造集成；不上传真实私密数据/凭据或未经允许的工作资料。生产部署和对外发送消息由实际用户授权决定，不因开发任务自动获得。
