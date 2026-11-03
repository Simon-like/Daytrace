# MOBILE-001 任务交接

| 项目 | 内容 |
| --- | --- |
| 任务ID / owner / 工具 | MOBILE-001 / `kimi-MOBILE-001-h5` / Kimi |
| 用户授权与范围 | 保留第二轮桌面风格并统一设计，在 monorepo 内实现独立 H5；不做 UA 自动跳转，不宣称真机、性能或生产验收 |
| 基线 / 分支 / 提交或PR | 历史 main 对照 `1079863`，完整带入 SYSTEM-001 及前序交付；`agent/MOBILE-001/independent-h5`；代码提交 `456b08b`、`379208f`、`56c36e5`，文档提交见本分支；未集成 main、未部署 |

## 改了什么

工作区：`.local/worktrees/MOBILE-001`。新增 `apps/h5` 独立移动应用、四项底部导航、底部筛选、移动搜索和 Markdown 阅读；共享 `@daytrace/ui` 与 `@daytrace/content`，没有新增权威业务 API。主站增加 `/h5/` 代理，开发命令同时启动三服务，新增 H5 浏览器测试与证据。

集成时需注意一项跨任务增量：`packages/ui/src/select.tsx` 增加可选 `container`，供原生 dialog 内的 Select portal 使用；桌面默认行为不变。报告见工作区 `docs/project/reports/MOBILE-001.md`，开发与 Demo 手册已同步实际边界。

## 怎样验证

lint 158 文件 0 问题；全量 typecheck、build 通过；unit 43／43；integration 8＋13＋5；H5 Chromium 5／5、24 视口通过、page error 0；桌面 Chromium 19／19、56 视口通过、page error 0。首页、归档、搜索、阅读、320／768 首页和筛选面板截图已实际查看。证据在工作区 `docs/project/evidence/MOBILE-001/` 与 `docs/project/evidence/MOBILE-001-desktop/`。

## 下一位怎么接

- 尚未完成或风险：真实 iPhone／Safari 未验收；Select 4 倍 CPU 52ms 长事件仍属 UI-002 blocked；阅读页必要脚本 141768 gzip bytes 超 81920 bytes 预算。
- 下一步：用户检查桌面与 `/h5/`，随后进行真机移动验收；性能与真实身份另拆任务，不自动启动 QA／发布。
- 集成：以 MOBILE-001 最终差异带入 SYSTEM-001 及前序工作，不重复套补丁；不覆盖 UI-002 或其他 worktree 的未提交现场。
- 恢复：本轮没有数据迁移或部署；验证服务应全部停止，不能通过停止未知 Node 进程来“清理”。
