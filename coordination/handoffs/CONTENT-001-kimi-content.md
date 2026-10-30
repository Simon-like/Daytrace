# CONTENT-001 集成交接

- 日期：2026-10-30
- 执行者：kimi-content；基线：203d204
- 最终任务提交：be3cc0e1d6ca052b3b4337c4438467c73c898821
- 集成交接：已合并 main；未部署

详细交接见 `experiments/CONTENT-001/handoff.md`。交付三类 Markdown v1、frontmatter schema、`/api/v1` 契约、三类模板、迁移脚本、正常/缺失/重复/恶意/路径逃逸样本和 17 项参考测试。

关键决定：`draft/published/archived` 与 `public/private` 独立；只有 `published + public` 可公开；缺 visibility 安全失败；稳定 ID 与 slug/oldSlugs 唯一；附件仅按 ID；HTML 与目录同次解析；坏集合不得伪装空成功。

正式 TypeScript 契约、Nest 服务、真实权限与缓存仍由 ENGINE/ACCESS 实现，实验测试不等于正式 AC 通过。
