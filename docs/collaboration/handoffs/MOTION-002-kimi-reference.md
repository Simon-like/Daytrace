# MOTION-002 任务交接

| 项目 | 内容 |
| --- | --- |
| 任务 / owner / 工具 | MOTION-002 / `kimi-MOTION-002-reference` / Kimi |
| 用户授权与范围 | 按已批准计划落地动效参考并继续 Markdown 专项；本交接只覆盖动效，不含生产、权限或部署。 |
| 基线 / 分支 / 提交 | `1079863` / `agent/MOTION-002/reference-motion` / 无提交、PR、集成或部署；补丁带入 UI-001、MOTION-001。 |

## 改了什么

交付位于 `.local/worktrees/MOTION-002`。新增共享动效令牌，完成 Select、原生 dialog 移动导航和图片灯箱的进入／退出；Button、Input、Checkbox、筛选与搜索状态复用反馈。新增性能采样脚本、浏览器回归、计划和报告。没有新增动画依赖，没有改 API、内容数据或权限。

主要文件：`apps/site/src/app/globals.css`、`apps/site/src/components/ui/`、`apps/site/src/features/reader/reader.module.css`、`tests/e2e/acceptance/`、`docs/project/reports/MOTION-002.md`。

## 怎样验证

在 MOTION-002 工作区使用 Node.js 24.18.0：

- lint、typecheck、unit 42／42、integration 26／26、build、project_check、diff check 全部通过。
- 浏览器 15／15，56 组视口无整页横溢出，console error 0。
- 正常与 4× CPU 的 Select／移动导航／灯箱 6／6 场景通过，>50ms RunTask、observer long task、DroppedFrame、unexpected layout shift 均为 0。
- 证据：`docs/project/evidence/MOTION-002/`；正文脚本 142121 gzip bytes，高于 81920 bytes 预算，未达标。

## 下一位怎么接

- 风险与边界：未测真实 iPhone、跨浏览器或生产；性能 trace 不是线上 Web Vitals；所有工作未提交、未集成。
- 下一步：认领 READER-002，从最新主分支新 worktree 以补丁带入 UI-001、MOTION-001、MOTION-002，完成服务端 Markdown 语义结构和正文排版。
- 不要覆盖主 checkout 或其他 worktree 的未提交现场；`git diff` 不含未跟踪文件，转移时需显式保留新增文件。
