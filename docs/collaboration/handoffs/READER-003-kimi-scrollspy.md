# READER-003 交接

- owner / 工具：kimi-READER-003-scrollspy / Kimi。
- 用户授权：同步 Codex 进度并修复文章右侧目录的滚动定位；不含生产部署或真机验收。
- 基线：同步 Codex CONTENT-003 后的 `dev` `0465550`，直接在 `dev` 串行完成。

交付与实测见[READER-003 报告](../../project/reports/READER-003.md)。正文 AST、标题 ID、Nest API、H5 和依赖均未修改。

## 验证

lint、三端 typecheck、reader 单测 10／10、Chromium 浏览器 2／2 通过。证据位于 `docs/project/evidence/READER-003/`，使用本地合成内容，不包含私密材料。

## 下一位接手

后续目录定位规则应继续复用 `resolveActiveHeadingId`，不要重新引入只能覆盖部分标题的窄观察带。新增阅读布局时保留首屏、双向滚动、页底和点击行为回归。真实 Safari／iPhone 和既有性能预算仍未验收。

既有 `apps/site/next-env.d.ts`、ARCH-001 两个证据文件及未跟踪 `daytrace-website-icon` 设计目录不属于本任务，保持原现场。
